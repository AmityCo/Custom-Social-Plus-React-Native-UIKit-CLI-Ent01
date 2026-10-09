/**
 * Minimal string lookup.
 *
 * Upstream (v4.3.1) ships a full localization module: a LocaleProvider, a
 * `localization` prop on AmityUiKitProvider and per-locale bundles. This fork
 * does not carry that yet, and adding a provider prop would mean touching
 * AmityUiKitProvider - which this fork customises heavily.
 *
 * So this exposes the same two functions against a flat English map, holding
 * only the keys the features that need them actually use. Call sites written
 * against upstream therefore compile unchanged, and dropping in the real module
 * later is a straight replacement at this same path.
 *
 * An unknown key returns the key itself, which is visible in the UI rather than
 * silently blank - a missing string should be obvious, not invisible.
 */
const STRINGS: Record<string, string> = {
  amity_social_button_post_reported: 'Post reported.',
  amity_social_comment_report_failed:
    'Failed to report comment. Please try again.',
  amity_social_reply_report_failed: 'Failed to report reply. Please try again.',
  amity_social_toast_comment_reported_toast_message: 'Comment reported.',
  amity_social_toast_post_report_failed:
    'Failed to report post. Please try again.',
  amity_social_toast_reply_reported_toast_message: 'Reply reported.',
  amity_social_button_report_reason: 'Report reason',
  amity_social_button_others: 'Other',
  amity_social_report_list_screen_description:
    "Tell us why you're reporting this content. Your report will be reviewed by our moderators and kept confidential.",
  amity_social_label_report_other_reason_desc: 'Describe your reason',
  amity_social_button_report_other_reason_optional: '(Optional)',
  amity_social_placeholder_report_text_placeholder:
    'Share more details about this issue',
  amity_social_button_report_submit_button: 'Submit',
  amity_social_modal_dialog_close_button: 'Close',
  amity_social_label_livestream_deleted_page_title: 'Something went wrong',
  amity_social_button_livestream_unavailable_desc:
    "The content you're looking for is unavailable.",
  amity_social_label_no_internet_connection: 'No internet connection.',
  amity_social_label_report_reason_community_guidelines:
    'Against community guidelines',
  amity_social_label_report_reason_intellectual_property:
    'Intellectual property infringement',
};

/** Resolve a key outside a component (lists, maps, constants). */
export const resolveString = (key: string): string => STRINGS[key] ?? key;

/** Resolve a key inside a component. Stable - there is no runtime locale yet. */
export const useString = (key: string): string => resolveString(key);
