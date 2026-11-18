import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ContentFlagReasonEnum } from '@amityco/ts-sdk-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNetworkOnline } from '../../../../../core/hooks/useNetworkOnline';
import { useToast } from '../../../../../core/stores/slices/toastSlice';
import { resolveString, useString } from '../../../../../core/localization';
import { CHARACTER_LIMIT } from '../../../../../core/constants';
import { useAmityComponent, useAmityElement } from '../../../../hooks';
import { useFlagContent } from '../../../../hooks/queries/useFlagContent';
import { ComponentID, ElementID, PageID } from '../../../../enums';
import { useBehaviour } from '../../../../providers/BehaviourProvider';
import { ReportContentType } from '../../../../types';
import type { ContentReportReasonProps, ReportReasonOption } from '../types';
import { useStyles } from '../styles';

const INTELLECTUAL_PROPERTY_REASON = 'Intellectual property infringement';

const INTELLECTUAL_PROPERTY_TITLE_KEY: Record<ReportContentType, string> = {
  [ReportContentType.post]: 'amity_social_report_ip_dialog_title_post',
  [ReportContentType.comment]: 'amity_social_report_ip_dialog_title_comment',
  [ReportContentType.reply]: 'amity_social_report_ip_dialog_title_reply',
};

// "Others" is not in this list: it is a row of its own that opens the free-text
// view instead of being selected in place.
const REPORT_REASONS: { value: Amity.ContentFlagReason; labelKey: string }[] = [
  {
    value: ContentFlagReasonEnum.CommunityGuidelines,
    labelKey: 'amity_social_label_report_reason_community_guidelines',
  },
  {
    // Not one of the SDK's preset reasons. useFlagContent calls the flag API
    // directly, so it is filed as its own reason rather than as Others.
    value: INTELLECTUAL_PROPERTY_REASON,
    labelKey: 'amity_social_label_report_reason_intellectual_property',
  },
];

export function useContentReportReason({
  contentType,
  contentId,
  onClose,
  onReported,
  pageId = PageID.WildCardPage,
}: ContentReportReasonProps) {
  const componentId = ComponentID.content_report_reason;
  const { styles, theme } = useStyles();
  const { showToast } = useToast();
  const { online } = useNetworkOnline();
  const { reportContent, isPending, isContentDeleted } = useFlagContent({
    contentType,
    contentId,
  });
  const { accessibilityId } = useAmityComponent({ pageId, componentId });
  const { accessibilityId: submitButtonId } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.submit_button,
  });
  const { accessibilityId: closeButtonId } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.close_button,
  });
  // The description and the continue button name the host's own policy, so
  // both can be reworded in the UIKit config.
  const {
    config: intellectualPropertyDescriptionConfig,
    accessibilityId: intellectualPropertyDescriptionId,
  } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.intellectual_property_description,
  });
  const { accessibilityId: copyContentIdButtonId } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.copy_content_id_button,
  });
  const {
    config: intellectualPropertyPolicyButtonConfig,
    accessibilityId: intellectualPropertyPolicyButtonId,
  } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.intellectual_property_policy_button,
  });
  const { AmityContentReportReasonComponentBehavior } = useBehaviour();
  const goToIntellectualPropertyPolicy =
    AmityContentReportReasonComponentBehavior?.goToIntellectualPropertyPolicy;

  // Every way out of the sheet (the X, Close, a successful report, the
  // backdrop, a drag, Android back) ends with this flag off. The sheet slides
  // out first and calls `onClose` at the end, which is where its owner
  // unmounts it.
  const [isSheetVisible, setIsSheetVisible] = useState(true);
  const [isShowOthersOption, setIsShowOthersOption] = useState(false);
  const [otherReasonText, setOtherReasonText] = useState('');
  const [selectedReason, setSelectedReason] =
    useState<Amity.ContentFlagReason>();
  const [
    isIntellectualPropertyDialogVisible,
    setIsIntellectualPropertyDialogVisible,
  ] = useState(false);
  const [isContentIdCopied, setIsContentIdCopied] = useState(false);
  // Set by Continue. The policy opens once the sheet has gone.
  const shouldOpenPolicy = useRef(false);

  const reportReasonTitle = useString('amity_social_button_report_reason');
  const othersTitle = useString('amity_social_button_others');
  const description = useString('amity_social_report_list_screen_description');
  const otherReasonTitle = useString(
    'amity_social_label_report_other_reason_desc'
  );
  const otherReasonOptional = useString(
    'amity_social_button_report_other_reason_optional'
  );
  const otherReasonPlaceholder = useString(
    'amity_social_placeholder_report_text_placeholder'
  );
  const submitText = useString('amity_social_button_report_submit_button');
  const closeText = useString('amity_social_modal_dialog_close_button');
  const unavailableTitle = useString(
    'amity_social_label_livestream_deleted_page_title'
  );
  const unavailableDescription = useString(
    'amity_social_button_livestream_unavailable_desc'
  );
  const noInternetText = useString('amity_social_label_no_internet_connection');
  const intellectualPropertyTitle = useString(
    INTELLECTUAL_PROPERTY_TITLE_KEY[contentType]
  );
  const intellectualPropertyDescription = useString(
    'amity_social_report_ip_dialog_description'
  );
  const contentIdLabel = useString('amity_social_report_ip_dialog_content_id');
  const copyText = useString('amity_social_report_ip_dialog_copy');
  const copiedText = useString('amity_social_report_ip_dialog_copied');
  const continueToPolicyText = useString(
    'amity_social_report_ip_dialog_continue'
  );
  const cancelText = useString('amity_social_report_ip_dialog_cancel');

  const reasons: ReportReasonOption[] = REPORT_REASONS.map(
    ({ value, labelKey }) => ({ value, label: resolveString(labelKey) })
  );

  useEffect(() => {
    if (!online) showToast({ type: 'informative', message: noInternetText });
  }, [online]);

  const requestClose = () => setIsSheetVisible(false);

  const handleSheetClose = () => {
    setIsSheetVisible(false);
    onClose();
    // Only now: the host may open a screen or a browser, which iOS would not
    // present while the sheet's Modal is still up.
    if (shouldOpenPolicy.current) {
      shouldOpenPolicy.current = false;
      goToIntellectualPropertyPolicy?.({ contentId, contentType });
    }
  };

  const copyContentId = () => {
    Clipboard.setString(contentId);
    setIsContentIdCopied(true);
  };

  // The content is already reported by now, so both buttons close the sheet
  // too. On iOS the sheet waits for the dialog's Modal to finish dismissing:
  // dismissing both at once can leave one of them on screen. Android never
  // calls onDismiss, so it closes straight away.
  const closeIntellectualPropertyDialog = (openPolicy: boolean) => {
    shouldOpenPolicy.current = openPolicy;
    setIsIntellectualPropertyDialogVisible(false);
    if (Platform.OS !== 'ios') requestClose();
  };

  const continueToPolicy = () => closeIntellectualPropertyDialog(true);

  const cancelIntellectualPropertyDialog = () =>
    closeIntellectualPropertyDialog(false);

  /** Hand to the dialog Modal's `onDismiss`. */
  const handleIntellectualPropertyDialogDismiss = () => requestClose();

  const showOthersOption = () => {
    setSelectedReason(ContentFlagReasonEnum.Others);
    setIsShowOthersOption(true);
  };

  const hideOthersOption = () => {
    setSelectedReason(undefined);
    setIsShowOthersOption(false);
  };

  // Enter may not start a new line; the text still wraps. Stripping on change
  // also catches a pasted multi-line string.
  const changeOtherReasonText = (text: string) =>
    setOtherReasonText(text.replace(/[\r\n]+/g, ''));

  const isSubmitDisabled = !selectedReason || !online || isPending;

  const submitReport = () => {
    if (isSubmitDisabled) return;

    // Others carries the free text as its detail, which may be empty since the
    // description is optional. Every other reason sends itself, with no detail.
    const params =
      selectedReason === ContentFlagReasonEnum.Others
        ? { reason: selectedReason, detail: otherReasonText.trim() }
        : { reason: selectedReason };

    reportContent(params, {
      onSuccess: () => {
        onReported?.();
        // The claim itself is filed on the host's policy page, so the dialog
        // hands the guest the content ID to paste there before the sheet goes.
        if (
          selectedReason === INTELLECTUAL_PROPERTY_REASON &&
          goToIntellectualPropertyPolicy
        ) {
          setIsIntellectualPropertyDialogVisible(true);
          return;
        }
        requestClose();
      },
    });
  };

  return {
    styles,
    theme,
    pageId,
    componentId,
    accessibilityId,
    submitButtonId,
    closeButtonId,
    intellectualPropertyDescriptionId,
    copyContentIdButtonId,
    intellectualPropertyPolicyButtonId,
    isSheetVisible,
    isIntellectualPropertyDialogVisible,
    isContentIdCopied,
    contentId,
    isShowOthersOption,
    isContentDeleted,
    isPending,
    isSubmitDisabled,
    reasons,
    selectedReason,
    otherReasonText,
    otherReasonMaxLength: CHARACTER_LIMIT.REPORT_REASON_DETAIL,
    texts: {
      title: isShowOthersOption ? othersTitle : reportReasonTitle,
      others: othersTitle,
      description,
      otherReasonTitle,
      otherReasonOptional,
      otherReasonPlaceholder,
      submit: submitText,
      close: closeText,
      unavailableTitle,
      unavailableDescription,
      intellectualPropertyTitle,
      intellectualPropertyDescription:
        (intellectualPropertyDescriptionConfig?.text as string) ??
        intellectualPropertyDescription,
      contentIdLabel,
      copyContentId: isContentIdCopied ? copiedText : copyText,
      continueToPolicy:
        (intellectualPropertyPolicyButtonConfig?.text as string) ??
        continueToPolicyText,
      cancel: cancelText,
    },
    setSelectedReason,
    changeOtherReasonText,
    showOthersOption,
    hideOthersOption,
    requestClose,
    handleSheetClose,
    submitReport,
    copyContentId,
    continueToPolicy,
    cancelIntellectualPropertyDialog,
    handleIntellectualPropertyDialogDismiss,
  };
}
