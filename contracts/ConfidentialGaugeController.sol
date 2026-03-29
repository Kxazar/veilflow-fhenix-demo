// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FHE, InEuint8, ebool, euint8, euint128} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ConfidentialGaugeController is Ownable {
    struct LockPosition {
        uint128 amount;
        uint64 unlockTime;
    }

    struct Gauge {
        string name;
        string pairLabel;
        address recipient;
        bool active;
    }

    error AmountZero();
    error DurationTooShort();
    error DurationTooLong();
    error LockAlreadyActive();
    error LockNotExpired();
    error LockMissing();
    error InvalidGauge();
    error TooManyGauges();
    error EpochAlreadyVoted();
    error EpochNotFinished();
    error EpochAlreadyRevealed();
    error EpochAlreadySettled();
    error EpochSettlementPending();
    error NoVotingPower();
    error ZeroAddress();
    error NoActiveGauges();
    error InsufficientEmissionInventory();

    event GaugeRegistered(uint256 indexed gaugeId, string name, string pairLabel, address recipient);
    event Locked(address indexed account, uint256 amount, uint256 unlockTime);
    event LockAmountIncreased(address indexed account, uint256 amount, uint256 newAmount);
    event LockExtended(address indexed account, uint256 newUnlockTime);
    event Withdrawn(address indexed account, uint256 amount);
    event Voted(uint256 indexed epochId, address indexed voter, euint8 encryptedGaugeIndex, uint256 votingPower);
    event EpochRevealed(uint256 indexed epochId, uint256 emissionAmount);
    event EpochSettled(uint256 indexed epochId, uint256 totalWeight, uint256 floorPerGauge);
    event WeeklyEmissionUpdated(uint256 newEmission);

    uint64 public constant MIN_LOCK_TIME = 7 days;
    uint64 public constant MAX_LOCK_TIME = 4 * 365 days;
    uint64 public constant EPOCH_DURATION = 7 days;
    uint8 public constant MAX_GAUGES = 6;
    uint16 public constant FLOOR_PER_GAUGE_BPS = 500;
    uint16 public constant BPS = 10_000;

    IERC20 public immutable voteToken;
    uint256 public immutable launchTime;

    uint256 public gaugeCount;
    uint256 public weeklyEmission;

    euint128 private zeroWeight;

    mapping(address => LockPosition) public locks;
    mapping(uint256 => Gauge) private gauges;
    mapping(uint256 => mapping(uint256 => euint128)) private epochGaugeWeights;
    mapping(uint256 => mapping(uint256 => bool)) private epochGaugeInitialized;
    mapping(uint256 => mapping(address => bool)) public hasVotedInEpoch;
    mapping(uint256 => bool) public epochRevealed;
    mapping(uint256 => bool) public epochSettled;
    mapping(uint256 => uint256) public epochEmission;
    mapping(uint256 => mapping(uint256 => uint256)) public epochGaugeEmission;

    constructor(address voteToken_, uint256 weeklyEmission_) Ownable(msg.sender) {
        if (voteToken_ == address(0)) revert ZeroAddress();

        voteToken = IERC20(voteToken_);
        launchTime = block.timestamp;
        weeklyEmission = weeklyEmission_;

        zeroWeight = FHE.asEuint128(0);
        FHE.allowThis(zeroWeight);
    }

    function registerGauge(
        string calldata name,
        string calldata pairLabel,
        address recipient
    ) external onlyOwner returns (uint256 gaugeId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (gaugeCount >= MAX_GAUGES) revert TooManyGauges();

        gaugeId = gaugeCount++;
        gauges[gaugeId] = Gauge({
            name: name,
            pairLabel: pairLabel,
            recipient: recipient,
            active: true
        });

        emit GaugeRegistered(gaugeId, name, pairLabel, recipient);
    }

    function setWeeklyEmission(uint256 newEmission) external onlyOwner {
        weeklyEmission = newEmission;
        emit WeeklyEmissionUpdated(newEmission);
    }

    function lock(uint128 amount, uint64 duration) external {
        if (amount == 0) revert AmountZero();
        if (duration < MIN_LOCK_TIME) revert DurationTooShort();
        if (duration > MAX_LOCK_TIME) revert DurationTooLong();

        LockPosition storage position = locks[msg.sender];
        if (position.amount != 0 && block.timestamp < position.unlockTime) revert LockAlreadyActive();
        if (position.amount != 0 && block.timestamp >= position.unlockTime) {
            revert LockNotExpired();
        }

        voteToken.transferFrom(msg.sender, address(this), amount);

        position.amount = amount;
        position.unlockTime = uint64(block.timestamp) + duration;

        emit Locked(msg.sender, amount, position.unlockTime);
    }

    function increaseLockAmount(uint128 amount) external {
        if (amount == 0) revert AmountZero();

        LockPosition storage position = locks[msg.sender];
        if (position.amount == 0) revert LockMissing();
        if (block.timestamp >= position.unlockTime) revert LockNotExpired();

        voteToken.transferFrom(msg.sender, address(this), amount);
        position.amount += amount;

        emit LockAmountIncreased(msg.sender, amount, position.amount);
    }

    function extendLock(uint64 additionalDuration) external {
        if (additionalDuration == 0) revert DurationTooShort();

        LockPosition storage position = locks[msg.sender];
        if (position.amount == 0) revert LockMissing();
        if (block.timestamp >= position.unlockTime) revert LockNotExpired();

        uint256 remaining = position.unlockTime - uint64(block.timestamp);
        uint256 nextDuration = remaining + additionalDuration;
        if (nextDuration > MAX_LOCK_TIME) revert DurationTooLong();

        position.unlockTime += additionalDuration;
        emit LockExtended(msg.sender, position.unlockTime);
    }

    function withdrawExpiredLock() external {
        LockPosition memory position = locks[msg.sender];
        if (position.amount == 0) revert LockMissing();
        if (block.timestamp < position.unlockTime) revert LockAlreadyActive();

        delete locks[msg.sender];
        voteToken.transfer(msg.sender, position.amount);

        emit Withdrawn(msg.sender, position.amount);
    }

    function vote(uint256 epochId, InEuint8 calldata encryptedGaugeIndex) external {
        if (epochId != currentEpoch()) revert EpochNotFinished();
        if (hasVotedInEpoch[epochId][msg.sender]) revert EpochAlreadyVoted();

        uint128 power = votingPowerOf(msg.sender);
        if (power == 0) revert NoVotingPower();

        euint8 gaugeIndex = FHE.asEuint8(encryptedGaugeIndex);
        euint128 votingPower = FHE.asEuint128(power);
        FHE.allowThis(votingPower);

        for (uint8 gaugeId = 0; gaugeId < gaugeCount; gaugeId++) {
            if (!epochGaugeInitialized[epochId][gaugeId]) {
                epochGaugeWeights[epochId][gaugeId] = zeroWeight;
                epochGaugeInitialized[epochId][gaugeId] = true;
            }

            ebool isSelected = FHE.eq(gaugeIndex, FHE.asEuint8(gaugeId));
            euint128 increment = FHE.select(isSelected, votingPower, zeroWeight);
            epochGaugeWeights[epochId][gaugeId] = FHE.add(epochGaugeWeights[epochId][gaugeId], increment);
            FHE.allowThis(epochGaugeWeights[epochId][gaugeId]);
        }

        hasVotedInEpoch[epochId][msg.sender] = true;
        FHE.allowSender(gaugeIndex);

        emit Voted(epochId, msg.sender, gaugeIndex, power);
    }

    function revealEpoch(uint256 epochId) external onlyOwner {
        uint256 epochEnd = launchTime + ((epochId + 1) * EPOCH_DURATION);
        if (block.timestamp < epochEnd) revert EpochNotFinished();
        if (epochRevealed[epochId]) revert EpochAlreadyRevealed();

        epochRevealed[epochId] = true;
        epochEmission[epochId] = weeklyEmission;

        for (uint8 gaugeId = 0; gaugeId < gaugeCount; gaugeId++) {
            if (!epochGaugeInitialized[epochId][gaugeId]) {
                epochGaugeWeights[epochId][gaugeId] = zeroWeight;
                epochGaugeInitialized[epochId][gaugeId] = true;
            }

            FHE.allowGlobal(epochGaugeWeights[epochId][gaugeId]);
            FHE.decrypt(epochGaugeWeights[epochId][gaugeId]);
        }

        emit EpochRevealed(epochId, weeklyEmission);
    }

    function settleEpoch(uint256 epochId) external {
        if (!epochRevealed[epochId]) revert EpochNotFinished();
        if (epochSettled[epochId]) revert EpochAlreadySettled();

        (uint256[] memory weights, uint256 activeGaugeCount, uint256 totalWeight, uint256 firstActiveGaugeId) =
            _collectEpochWeights(epochId);
        uint256 emissionBudget = epochEmission[epochId];
        if (voteToken.balanceOf(address(this)) < emissionBudget) revert InsufficientEmissionInventory();

        uint256 floorPerGauge =
            _assignEpochEmission(epochId, weights, activeGaugeCount, totalWeight, emissionBudget, firstActiveGaugeId);
        epochSettled[epochId] = true;
        _transferEpochEmission(epochId);
        emit EpochSettled(epochId, totalWeight, floorPerGauge);
    }

    function _collectEpochWeights(uint256 epochId)
        internal
        view
        returns (uint256[] memory weights, uint256 activeGaugeCount, uint256 totalWeight, uint256 firstActiveGaugeId)
    {
        weights = new uint256[](gaugeCount);
        firstActiveGaugeId = type(uint256).max;

        for (uint256 gaugeId = 0; gaugeId < gaugeCount; gaugeId++) {
            if (!gauges[gaugeId].active) {
                continue;
            }

            if (firstActiveGaugeId == type(uint256).max) {
                firstActiveGaugeId = gaugeId;
            }
            activeGaugeCount++;

            (uint256 decryptedWeight, bool decrypted) = FHE.getDecryptResultSafe(epochGaugeWeights[epochId][gaugeId]);
            if (!decrypted) revert EpochSettlementPending();

            weights[gaugeId] = decryptedWeight;
            totalWeight += decryptedWeight;
        }

        if (activeGaugeCount == 0) revert NoActiveGauges();
    }

    function _assignEpochEmission(
        uint256 epochId,
        uint256[] memory weights,
        uint256 activeGaugeCount,
        uint256 totalWeight,
        uint256 emissionBudget,
        uint256 firstActiveGaugeId
    ) internal returns (uint256 floorPerGauge) {
        floorPerGauge = (emissionBudget * FLOOR_PER_GAUGE_BPS) / BPS;
        uint256 totalFloor = floorPerGauge * activeGaugeCount;
        if (totalFloor > emissionBudget) {
            floorPerGauge = emissionBudget / activeGaugeCount;
            totalFloor = floorPerGauge * activeGaugeCount;
        }

        uint256 remainingBudget = emissionBudget - totalFloor;
        uint256 distributed;

        for (uint256 gaugeId = 0; gaugeId < gaugeCount; gaugeId++) {
            if (!gauges[gaugeId].active) {
                continue;
            }

            uint256 gaugeEmission = floorPerGauge + _variableShare(remainingBudget, activeGaugeCount, totalWeight, weights[gaugeId]);
            epochGaugeEmission[epochId][gaugeId] = gaugeEmission;
            distributed += gaugeEmission;
        }

        uint256 undistributed = emissionBudget - distributed;
        if (undistributed != 0) {
            epochGaugeEmission[epochId][firstActiveGaugeId] += undistributed;
        }
    }

    function _variableShare(
        uint256 remainingBudget,
        uint256 activeGaugeCount,
        uint256 totalWeight,
        uint256 gaugeWeight
    ) internal pure returns (uint256) {
        if (remainingBudget == 0) {
            return 0;
        }

        if (totalWeight == 0) {
            return remainingBudget / activeGaugeCount;
        }

        return (remainingBudget * gaugeWeight) / totalWeight;
    }

    function _transferEpochEmission(uint256 epochId) internal {
        for (uint256 gaugeId = 0; gaugeId < gaugeCount; gaugeId++) {
            uint256 gaugeEmission = epochGaugeEmission[epochId][gaugeId];
            if (gaugeEmission == 0) {
                continue;
            }

            voteToken.transfer(gauges[gaugeId].recipient, gaugeEmission);
        }
    }

    function currentEpoch() public view returns (uint256) {
        return (block.timestamp - launchTime) / EPOCH_DURATION;
    }

    function votingPowerOf(address account) public view returns (uint128) {
        LockPosition memory position = locks[account];
        if (position.amount == 0 || block.timestamp >= position.unlockTime) {
            return 0;
        }

        uint256 remaining = position.unlockTime - uint64(block.timestamp);
        return uint128((uint256(position.amount) * remaining) / MAX_LOCK_TIME);
    }

    function getGauge(uint256 gaugeId) external view returns (Gauge memory) {
        if (gaugeId >= gaugeCount) revert InvalidGauge();
        return gauges[gaugeId];
    }

    function getEncryptedGaugeWeight(uint256 epochId, uint256 gaugeId) external view returns (euint128) {
        if (gaugeId >= gaugeCount) revert InvalidGauge();
        if (!epochGaugeInitialized[epochId][gaugeId]) {
            return zeroWeight;
        }
        return epochGaugeWeights[epochId][gaugeId];
    }
}
