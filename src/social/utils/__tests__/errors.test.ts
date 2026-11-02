import { PROFILE_ERROR_MESSAGE } from '../../../core/constants';
import { getProfileErrorMessage } from '../errors';

// Shaped like the SDK's ASCApiError / ASCUnknownError.
const sdkError = (code: number, message: string, level = 'error') =>
  Object.assign(new Error(`Amity SDK (${code}): ${message}`), {
    code,
    level,
    type: 'ASC',
  });

const unsafeImage = () =>
  sdkError(400314, 'Image uploading failed: Nudity content is not permitted');

describe('getProfileErrorMessage', () => {
  it("shows the server's reason for a refusal it has no wording for", () => {
    expect(
      getProfileErrorMessage(sdkError(400900, 'Display name already exists'))
    ).toBe('Display name already exists');
  });

  it("shows the reason the host's pre-hook gave for a refusal", () => {
    const taken =
      'This display name is already taken. Please choose another one.';
    expect(
      getProfileErrorMessage(sdkError(400000, `Deny from prehook: ${taken}`))
    ).toBe(taken);
    // Passed on by the host's enrollProfile.
    expect(
      getProfileErrorMessage(new Error(`Deny from prehook: ${taken}`))
    ).toBe(taken);
    // A pre-hook that gave no reason.
    expect(
      getProfileErrorMessage(sdkError(400000, 'Deny from prehook: '))
    ).toBe(PROFILE_ERROR_MESSAGE.GENERIC);
  });

  it('keeps its own wording for the refusals it knows', () => {
    expect(
      getProfileErrorMessage(sdkError(400308, 'Text contain blocked word'))
    ).toBe(PROFILE_ERROR_MESSAGE.BLOCKED_WORD);
    expect(getProfileErrorMessage(unsafeImage())).toBe(
      PROFILE_ERROR_MESSAGE.INAPPROPRIATE_IMAGE
    );
  });

  it('falls back to the generic message when the server gave no reason', () => {
    expect(
      getProfileErrorMessage(sdkError(800000, 'Unexpected error', 'fatal'))
    ).toBe(PROFILE_ERROR_MESSAGE.GENERIC);
    expect(getProfileErrorMessage(new Error('[object Object]'))).toBe(
      PROFILE_ERROR_MESSAGE.GENERIC
    );
    expect(getProfileErrorMessage(new Error('CreateProfile: no userId.'))).toBe(
      PROFILE_ERROR_MESSAGE.GENERIC
    );
  });

  it('calls a lost connection what it is', () => {
    expect(getProfileErrorMessage(new Error('AxiosError: Network Error'))).toBe(
      PROFILE_ERROR_MESSAGE.NETWORK
    );
  });
});
