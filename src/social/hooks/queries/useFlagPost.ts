import {
  createReport,
  deleteReport,
  isReportedByMe,
} from '@amityco/ts-sdk-react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '../../../core/stores/slices/toastSlice';
import { TOAST } from '../../../core/constants';

type UseFlagPost = {
  postId: string;
  enabled?: boolean;
};

// Shared with the report reason sheet, which reports through its own mutation
// and has to refresh this flag state so the post menu shows "Unreport post".
export const flagPostQueryKey = (postId: string) =>
  ['PostRepository', 'isPostFlaggedByMe', postId] as const;

export const useFlagPost = ({ postId, enabled = true }: UseFlagPost) => {
  const { showToast } = useToast();

  const {
    data: isFlaggedByMe,
    isLoading,
    isFetchedAfterMount,
    refetch,
  } = useQuery<boolean>({
    queryKey: flagPostQueryKey(postId),
    queryFn: () => isReportedByMe('post', postId),
    enabled: enabled && !!postId,
    // Ask the server every time this mounts, even with a cached answer.
    refetchOnMount: 'always',
  });
  // True until this mount has its own answer. A cached one is not trusted: the
  // post may have been reported since, from the web app or another device, and
  // reporting it again fails with "already flagged" (400300).
  const isChecking = enabled && !!postId && !isFetchedAfterMount;

  const { mutate: flagPostMutate } = useMutation<boolean, Error, string>({
    mutationFn: (targetPostId: string) => createReport('post', targetPostId),
  });

  const { mutate: unflagPostMutate } = useMutation<boolean, Error, string>({
    mutationFn: (targetPostId: string) => deleteReport('post', targetPostId),
  });

  const reportPost = (targetPostId: string) => {
    flagPostMutate(targetPostId, {
      onSuccess: () => {
        refetch();
        showToast({
          type: 'success',
          message: TOAST.POST.REPORT.SUCCESS,
        });
      },
      onError: () =>
        showToast({
          type: 'informative',
          message: TOAST.POST.REPORT.FAILED,
        }),
    });
  };

  const unreportPost = (targetPostId: string) => {
    unflagPostMutate(targetPostId, {
      onSuccess: () => {
        refetch();
        showToast({
          type: 'success',
          message: TOAST.POST.UNREPORT.SUCCESS,
        });
      },
      onError: () =>
        showToast({
          type: 'informative',
          message: TOAST.POST.UNREPORT.FAILED,
        }),
    });
  };

  return {
    isLoading,
    isChecking,
    isFlaggedByMe,
    reportPost,
    unreportPost,
  };
};
