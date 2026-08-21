import { base64Images } from './images/base64Images';

// Default avatars are exported as base64 data URIs rather than
// Image.resolveAssetSource(require(...)).uri.
//
// resolveAssetSource only yields a usable URL while Metro is serving assets over
// HTTP. In a bundled app it returns an Android drawable resource *name*, resolved
// at runtime via getIdentifier() against the host package - which silently fails
// in brownfield hosts where those drawables did not survive resource merging (or
// were stripped by the resource shrinker, since nothing references them
// statically). Data URIs live in the JS bundle and resolve in every host.
export const defaultAvatarUri = base64Images.userAvatar;
export const defaultCommunityAvatarUri = base64Images.communityAvatar;
export const defaultAdAvatarUri = base64Images.adAvatar;
