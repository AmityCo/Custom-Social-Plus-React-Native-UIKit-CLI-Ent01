import { useMemo } from 'react';

import useAuth from '../../core/hooks/useAuth';
import {
  canCreateCommunity,
  canPostVideo,
  isNormalUser,
} from '../../core/utils/capabilities';
import { useUser } from './useUser';

/**
 * What the signed-in user is allowed to do, from their global roles.
 *
 * Gates UI affordances only — see core/utils/capabilities for the caveat.
 * Roles resolve asynchronously; until they arrive the user is treated as a
 * normal user, so a restricted affordance is never briefly shown and then
 * taken away mid-tap.
 */
export const useCapabilities = () => {
  const { client } = useAuth();
  const currentUser = useUser((client as Amity.Client)?.userId || '');
  const roles = currentUser?.roles;

  return useMemo(
    () => ({
      isNormalUser: isNormalUser(roles),
      canPostVideo: canPostVideo(roles),
      canCreateCommunity: canCreateCommunity(roles),
    }),
    [roles]
  );
};
