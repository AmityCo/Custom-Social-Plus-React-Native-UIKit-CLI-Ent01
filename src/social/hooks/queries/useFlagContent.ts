import { useState } from 'react';
import { Client } from '@amityco/ts-sdk-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../core/stores/slices/toastSlice';
import { useString } from '../../../core/localization';
import { ERROR_CODE } from '../../../core/constants';
import { ReportContentType } from '../../types';
import { flagPostQueryKey } from './useFlagPost';

export type FlagContentParam = {
  /** Sent as is - a preset reason, a custom one, or Others. */
  reason: string;
  /** The reporter's own words, sent with Others. */
  detail?: string;
};

type UseFlagContent = {
  contentType: ReportContentType;
  contentId: string;
};

const REPORTED_TOAST_KEY: Record<ReportContentType, string> = {
  [ReportContentType.post]: 'amity_social_button_post_reported',
  [ReportContentType.comment]:
    'amity_social_toast_comment_reported_toast_message',
  [ReportContentType.reply]: 'amity_social_toast_reply_reported_toast_message',
};

const REPORT_FAILED_TOAST_KEY: Record<ReportContentType, string> = {
  [ReportContentType.post]: 'amity_social_toast_post_report_failed',
  [ReportContentType.comment]: 'amity_social_comment_report_failed',
  [ReportContentType.reply]: 'amity_social_reply_report_failed',
};

export const useFlagContent = ({ contentType, contentId }: UseFlagContent) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isContentDeleted, setIsContentDeleted] = useState(false);
  const reportedText = useString(REPORTED_TOAST_KEY[contentType]);
  const reportFailedText = useString(REPORT_FAILED_TOAST_KEY[contentType]);

  const { mutate: flagContentMutate, isPending } = useMutation<
    boolean,
    Error,
    FlagContentParam
  >({
    // Calls the flag endpoint directly rather than PostRepository.flagPost /
    // CommentRepository.flagComment. Those send any reason that is not one of
    // the SDK's presets as Others, moving it into `detail`, so a custom reason
    // such as "Intellectual property infringement" could never be filed as a
    // reason of its own. Errors are unchanged: the SDK makes the same call
    // through this client.
    //
    // Unlike the SDK calls, this does not update the SDK cache or fire its
    // flagged event. Nothing reads those: the post menu refetches
    // isReportedByMe from the server, and a comment row takes onReported.
    mutationFn: async ({ reason, detail = '' }) => {
      const resource =
        contentType === ReportContentType.post ? 'posts' : 'comments';
      const { data } = await Client.getActiveClient().http.post(
        `/api/v3/${resource}/${encodeURIComponent(contentId)}/flag`,
        { reason, detail }
      );
      return !!data;
    },
    onSuccess: () => {
      if (contentType !== ReportContentType.post) return;
      // The post menu reads this flag state to swap to "Unreport post".
      queryClient.setQueryData(flagPostQueryKey(contentId), true);
      queryClient.invalidateQueries({ queryKey: flagPostQueryKey(contentId) });
    },
  });

  const reportContent = (
    params: FlagContentParam,
    options?: { onSuccess?: () => void }
  ) => {
    flagContentMutate(params, {
      onSuccess: () => {
        showToast({ type: 'success', message: reportedText });
        options?.onSuccess?.();
      },
      onError: (error) => {
        // The content was deleted while the sheet was open. That is a state for
        // the sheet to show, not a toast.
        if (error?.message?.includes(ERROR_CODE.ITEM_NOT_FOUND)) {
          setIsContentDeleted(true);
          return;
        }
        showToast({ type: 'informative', message: reportFailedText });
      },
    });
  };

  return {
    reportContent,
    isPending,
    isContentDeleted,
  };
};
