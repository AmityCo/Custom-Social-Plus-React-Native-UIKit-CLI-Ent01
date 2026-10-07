import { CommunityRepository } from '@amityco/ts-sdk-react-native';
import { cancelPendingVisitorJoin } from '../../core/stores/pendingVisitorJoin';
import { useState } from 'react';

export const useLeaveCommunity = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
} = {}) => {
  const [isPending, setIsPending] = useState(false);

  const leaveCommunity = async (communityId: string) => {
    setIsPending(true);
    try {
      // Resolves `false` when the response does not report the membership as
      // dropped, i.e. the leave did not take. Reporting success in that case
      // left the user still a member while the UI said otherwise.
      const didLeave = await CommunityRepository.leaveCommunity(communityId);
      // Drop any pending visitor auto-join for this community, or the next
      // session event would join the user straight back.
      if (didLeave) cancelPendingVisitorJoin(communityId);
      setIsPending(false);
      if (!didLeave) {
        onError?.(new Error('Leave community did not take effect'));
        return;
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setIsPending(false);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  return {
    leaveCommunity,
    isPending,
  };
};
