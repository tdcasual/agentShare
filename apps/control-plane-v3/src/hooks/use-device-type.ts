'use client';

import { useEffect, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

interface DeviceTypeInfo {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isTabletPortrait: boolean;
  isTabletLandscape: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  width: number;
  height: number;
}


const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  large: 1280,
};

/**
 * 检测设备类型和方向
 *
 * 提供详细的设备类型检测，填补 768px-1024px 平板断点空白
 *
 * @example
 * const device = useDeviceType();
 *
 * if (device.isTabletPortrait) {
 * }
 */
export function useDeviceType(): DeviceTypeInfo {

  const [deviceInfo, setDeviceInfo] = useState<DeviceTypeInfo>(() => {

    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        isMobile: false,
        isTablet: false,
        isTabletPortrait: false,
        isTabletLandscape: false,
        isDesktop: true,
        orientation: 'landscape',
        width: 1920,
        height: 1080,
      };
    }

    return {
      type: 'desktop',
      isMobile: false,
      isTablet: false,
      isTabletPortrait: false,
      isTabletLandscape: false,
      isDesktop: true,
      orientation: 'landscape',
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation: Orientation = width > height ? 'landscape' : 'portrait';

      let type: DeviceType;
      let isMobile = false;
      let isTablet = false;
      let isTabletPortrait = false;
      let isTabletLandscape = false;
      let isDesktop = false;

      if (width < BREAKPOINTS.mobile) {

        type = 'mobile';
        isMobile = true;
      } else if (width <= BREAKPOINTS.tablet) {

        isTablet = true;
        if (orientation === 'portrait') {
          type = 'tablet-portrait';
          isTabletPortrait = true;
        } else {
          type = 'tablet-landscape';
          isTabletLandscape = true;
        }
      } else {

        type = 'desktop';
        isDesktop = true;
      }

      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isTabletPortrait,
        isTabletLandscape,
        isDesktop,
        orientation,
        width,
        height,
      });
    };


    let ticking = false;
    const throttledUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateDeviceType();
          ticking = false;
        });
        ticking = true;
      }
    };


    updateDeviceType();


    window.addEventListener('resize', throttledUpdate);
    window.addEventListener('orientationchange', updateDeviceType);

    return () => {
      window.removeEventListener('resize', throttledUpdate);
      window.removeEventListener('orientationchange', updateDeviceType);
    };
  }, []);

  return deviceInfo;
}

/**
 * 简化的移动设备检测
 */
export function useIsMobile(): boolean {
  const device = useDeviceType();
  return device.isMobile;
}

/**
 * 简化的平板设备检测
 */
export function useIsTablet(): boolean {
  const device = useDeviceType();
  return device.isTablet;
}

/**
 * 平板竖屏检测
 */
export function useIsTabletPortrait(): boolean {
  const device = useDeviceType();
  return device.isTabletPortrait;
}

/**
 * 平板横屏检测
 */
export function useIsTabletLandscape(): boolean {
  const device = useDeviceType();
  return device.isTabletLandscape;
}

/**
 * 桌面设备检测
 */
export function useIsDesktop(): boolean {
  const device = useDeviceType();
  return device.isDesktop;
}

/**
 * 屏幕方向检测
 */
export function useOrientation(): Orientation {
  const device = useDeviceType();
  return device.orientation;
}

/**
 * 视口尺寸
 */
export function useViewport(): { width: number; height: number } {
  const device = useDeviceType();
  return { width: device.width, height: device.height };
}
