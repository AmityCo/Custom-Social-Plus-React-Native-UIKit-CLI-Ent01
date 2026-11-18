import { useCallback, useRef, useState } from 'react';
import { isReportedByMe } from '@amityco/ts-sdk-react-native';
import {
  errorMessage,
  extractAmityCode,
  reportError,
} from '../../../../../core/errorReporter';

// For the comment and reply menus. Whether the user already reported the
// comment is asked each time its menu opens, like the web UIKit, not once when
// the row appears: that answer goes out of date when the comment is reported
// elsewhere (the web app, another device), and reporting it again fails with
// "already flagged" (400300). `isCheckingReportedByMe` stays true until this
// opening has its answer.
export function useCommentReportedByMe(commentId: string) {
  const [isReported, setIsReportedByMe] = useState(false);
  const [isCheckingReportedByMe, setIsCheckingReportedByMe] = useState(false);
  // Only the latest check may set state: a menu closed and opened again
  // quickly can have two in flight.
  const latestCheck = useRef(0);

  const checkReportedByMe = useCallback(async () => {
    const check = ++latestCheck.current;
    setIsCheckingReportedByMe(true);
    try {
      const reported = await isReportedByMe('comment', commentId);
      if (check === latestCheck.current) setIsReportedByMe(reported);
    } catch (error) {
      // Like the web UIKit, a failed check offers Report.
      if (check === latestCheck.current) setIsReportedByMe(false);
      reportError({
        source: 'sdk',
        message: errorMessage(
          error,
          'Failed to check whether the comment is reported'
        ),
        code: extractAmityCode(error),
        cause: error,
        context: { commentId, phase: 'isReportedByMe' },
        handled: false,
      });
    } finally {
      if (check === latestCheck.current) setIsCheckingReportedByMe(false);
    }
  }, [commentId]);

  return {
    isReportedByMe: isReported,
    isCheckingReportedByMe,
    checkReportedByMe,
    setIsReportedByMe,
  };
}
