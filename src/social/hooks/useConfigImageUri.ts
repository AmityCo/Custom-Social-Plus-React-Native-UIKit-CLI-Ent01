import { ImageURISource } from 'react-native';
import { defaultAvatarUri } from '../../core/assets';
import { useMemo } from 'react';
import useConfig from './useConfig';
import { IUIKitConfigOptions } from '../../core/types/config';
import { UiKitConfigKeys } from '../enums';
import { useDarkMode } from './useDarkMode';
import { base64Icons } from '../../core/assets/configs/base64Icons';

/**
 * Maps a `uikit.config.json` icon value to the inlined asset that backs it.
 * Entries carrying a `dark` variant swap on the active theme.
 *
 * These resolve to base64 data URIs (see base64Icons) instead of require()'d
 * PNGs. RN only serves require()'d images over HTTP while Metro is running;
 * without it the source becomes a runtime Android drawable lookup by name,
 * which fails wherever those drawables did not survive resource merging or
 * were stripped as "unused" by the resource shrinker - the reason config icons
 * went missing in brownfield hosts that ship a pre-built bundle.
 */
const CONFIG_ICON_FILES: Record<string, { light: string; dark?: string }> = {
  'aspect_ratio.png': { light: 'aspect_ratio' },
  'backButtonIcon': { light: 'backButtonIcon' },
  'badgeIcon': { light: 'badgeIcon' },
  'camera_button': { light: 'camera_button' },
  'clear': { light: 'clear' },
  'close_button': { light: 'close_button_light', dark: 'close_button_dark' },
  'commentButtonIcon': { light: 'commentButtonIcon' },
  'create_livestream_button': { light: 'create_livestream_button' },
  'create_poll_button': { light: 'create_poll_button' },
  'create_post_button': { light: 'create_post_button' },
  'create_story_button': { light: 'create_story_button' },
  'emptyFeedIcon': { light: 'emptyFeedIcon_light', dark: 'emptyFeedIcon_dark' },
  'empty_list_icon': { light: 'empty_list_icon' },
  'exploreCommunityIcon': { light: 'exploreCommunityIcon' },
  'file_button': { light: 'file_button' },
  'hyperlink_button.png': { light: 'hyperlink_button' },
  'image_button': { light: 'image_button' },
  'likeButtonIcon': { light: 'likeButtonIcon' },
  'lockIcon': { light: 'lockIcon' },
  'menuIcon': { light: 'menuIcon' },
  'mute.png': { light: 'mute' },
  'officialBadgeIcon': { light: 'officialBadgeIcon' },
  'postCreationIcon': { light: 'plus' },
  'search': { light: 'search' },
  'searchButtonIcon': { light: 'search' },
  'search_light': { light: 'search_light' },
  'shareButtonIcon': { light: 'shareButtonIcon' },
  'unmute.png': { light: 'unmute' },
  'video_button': { light: 'video_button' },
};

export const useConfigImageUri = ({
  configPath,
  configKey,
}: {
  configPath: IUIKitConfigOptions;
  configKey: keyof UiKitConfigKeys;
}): ImageURISource => {
  const { getUiKitConfig } = useConfig();
  const { isDarkTheme } = useDarkMode();
  const configImageUri = useMemo(() => {
    if (!configPath || !configKey) return defaultAvatarUri;
    const fileUri = getUiKitConfig(configPath)?.[configKey] as string;
    if (!fileUri) return defaultAvatarUri;
    if (fileUri.includes('http')) return fileUri;
    const entry = CONFIG_ICON_FILES[fileUri];
    if (!entry) return defaultAvatarUri;
    const file = isDarkTheme && entry.dark ? entry.dark : entry.light;
    return base64Icons[file] ?? defaultAvatarUri;
  }, [configPath, configKey, getUiKitConfig, isDarkTheme]);

  return { uri: configImageUri };
};
