import { useAmityElement } from '../../../../../../hooks';
import { ComponentID, ElementID, PageID } from '../../../../../../enums';
import { CommunityPrivacyOption } from '../../../../../../types';
import {
  public as $public,
  private as $private,
  worldWithLock,
} from '../../../../../../../core/assets/icons';
import { useStyles } from '../styles';

/**
 * Config text, or the web UIKit's wording when a host config predates the key.
 * Element config is read from the host's config only, with no default.
 */
function useConfigText(elementId: ElementID, fallback: string) {
  const { config } = useAmityElement({
    pageId: PageID.community_setup_page,
    componentId: ComponentID.WildCardComponent,
    elementId,
  });
  return (config?.text as string) ?? fallback;
}

export function usePrivacyOptions() {
  const { styles } = useStyles();

  const label = useConfigText(ElementID.community_privacy_title, 'Privacy');
  const publicTitle = useConfigText(
    ElementID.community_privacy_public_title,
    'Public'
  );
  const publicDescription = useConfigText(
    ElementID.community_privacy_public_description,
    'Community is discoverable by anyone. Content is visible to anyone.'
  );
  const privateVisibleTitle = useConfigText(
    ElementID.community_privacy_private_and_visible_title,
    'Private & visible'
  );
  const privateVisibleDescription = useConfigText(
    ElementID.community_privacy_private_and_visible_description,
    'Community is discoverable by anyone. Content is hidden from non-members.'
  );
  const privateHiddenTitle = useConfigText(
    ElementID.community_privacy_private_and_hidden_title,
    'Private & hidden'
  );
  const privateHiddenDescription = useConfigText(
    ElementID.community_privacy_private_and_hidden_description,
    'Community and content are hidden from non-members, and cannot be discovered via search.'
  );

  const options = [
    {
      value: CommunityPrivacyOption.public,
      icon: $public(),
      iconElementId: ElementID.community_privacy_public_icon,
      title: publicTitle,
      description: publicDescription,
    },
    {
      value: CommunityPrivacyOption.privateVisible,
      icon: worldWithLock(),
      iconElementId: ElementID.community_privacy_private_and_visible_icon,
      title: privateVisibleTitle,
      description: privateVisibleDescription,
    },
    {
      value: CommunityPrivacyOption.privateHidden,
      icon: $private(),
      iconElementId: ElementID.community_privacy_private_and_hidden_icon,
      title: privateHiddenTitle,
      description: privateHiddenDescription,
    },
  ];

  return { styles, label, options };
}
