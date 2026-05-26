<template>
  <view class="moo-empty-art">
    <view class="cloud cloud-left">
      <view class="cloud-puff cloud-puff-one"></view>
      <view class="cloud-puff cloud-puff-two"></view>
    </view>
    <view class="cloud cloud-right">
      <view class="cloud-puff cloud-puff-one"></view>
      <view class="cloud-puff cloud-puff-two"></view>
    </view>
    <view class="star star-one">
      <view class="star-line star-line-x"></view>
      <view class="star-line star-line-y"></view>
    </view>
    <view class="star star-two">
      <view class="star-line star-line-x"></view>
      <view class="star-line star-line-y"></view>
    </view>
    <view class="moo-head">
      <view class="moo-ear moo-ear-left"></view>
      <view class="moo-ear moo-ear-right"></view>
      <view class="moo-horn moo-horn-left"></view>
      <view class="moo-horn moo-horn-right"></view>
      <view class="moo-spot moo-spot-big"></view>
      <view class="moo-spot moo-spot-small"></view>
      <view class="moo-eye moo-eye-left"></view>
      <view class="moo-eye moo-eye-right"></view>
      <view class="moo-nose">
        <view class="moo-nostril moo-nostril-left"></view>
        <view class="moo-nostril moo-nostril-right"></view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.moo-empty-art {
  position: relative;
  width: 240rpx;
  height: 168rpx;
  margin: 0 auto 24rpx;
}

.cloud {
  position: absolute;
  height: 28rpx;
  border-radius: 999px;
  background: #eef4f0;
  box-shadow: 0 10rpx 26rpx rgba(93, 111, 125, 0.08);
}

.cloud-left {
  left: 8rpx;
  top: 78rpx;
  width: 72rpx;
}

.cloud-right {
  right: 10rpx;
  top: 42rpx;
  width: 82rpx;
  background: #f4f0df;
}

.cloud-puff {
  position: absolute;
  bottom: 8rpx;
  border-radius: 50%;
  background: inherit;
}

.cloud-puff-one {
  left: 12rpx;
  width: 28rpx;
  height: 28rpx;
}

.cloud-puff-two {
  right: 12rpx;
  width: 36rpx;
  height: 36rpx;
}

.star {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  transform: rotate(45deg);
}

.star-one {
  left: 50rpx;
  top: 16rpx;
}

.star-two {
  right: 52rpx;
  top: 112rpx;
  transform: rotate(45deg) scale(0.72);
}

.star-line {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  background: #eecb70;
  transform: translate(-50%, -50%);
}

.star-line-x {
  width: 28rpx;
  height: 8rpx;
}

.star-line-y {
  width: 8rpx;
  height: 28rpx;
}

.moo-head {
  position: absolute;
  left: 50%;
  bottom: 4rpx;
  z-index: 2;
  width: 132rpx;
  height: 102rpx;
  border: 4rpx solid #6f95bf;
  border-radius: 48% 48% 44% 44%;
  background: #fffdfa;
  box-shadow: 0 16rpx 34rpx rgba(71, 94, 115, 0.12);
  transform: translateX(-50%);
}

.moo-ear {
  position: absolute;
  top: 16rpx;
  z-index: -1;
  width: 36rpx;
  height: 46rpx;
  border: 4rpx solid #6f95bf;
  border-radius: 60% 40% 60% 40%;
  background: #f6dfe3;
}

.moo-ear-left {
  left: -22rpx;
  transform: rotate(-18deg);
}

.moo-ear-right {
  right: -22rpx;
  transform: rotate(18deg) scaleX(-1);
}

.moo-horn {
  position: absolute;
  top: -14rpx;
  width: 22rpx;
  height: 28rpx;
  border-radius: 20rpx 20rpx 8rpx 8rpx;
  background: #f0d891;
}

.moo-horn-left {
  left: 28rpx;
  transform: rotate(-12deg);
}

.moo-horn-right {
  right: 28rpx;
  transform: rotate(12deg);
}

.moo-spot {
  position: absolute;
  border-radius: 50%;
  background: #dce8f2;
}

.moo-spot-big {
  left: 18rpx;
  top: 16rpx;
  width: 42rpx;
  height: 32rpx;
  transform: rotate(-18deg);
}

.moo-spot-small {
  right: 20rpx;
  top: 22rpx;
  width: 22rpx;
  height: 18rpx;
}

.moo-eye {
  position: absolute;
  top: 48rpx;
  width: 10rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #52636f;
}

.moo-eye-left {
  left: 38rpx;
}

.moo-eye-right {
  right: 38rpx;
}

.moo-nose {
  position: absolute;
  left: 50%;
  bottom: 14rpx;
  width: 54rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #f7dfe2;
  transform: translateX(-50%);
}

.moo-nostril {
  position: absolute;
  top: 11rpx;
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: #9c7a82;
}

.moo-nostril-left {
  left: 16rpx;
}

.moo-nostril-right {
  right: 16rpx;
}
</style>
