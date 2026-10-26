import { useAmityElement } from '../../../../../../hooks';
import { ComponentID, ElementID, PageID } from '../../../../../../enums';
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

export function useMembership() {
  const { styles, theme } = useStyles();

  const label = useConfigText(
    ElementID.community_membership_title,
    'Membership'
  );
  const description = useConfigText(
    ElementID.community_membership_description,
    'Requires moderator approval'
  );
  const subDescription = useConfigText(
    ElementID.community_membership_sub_description,
    'Users will become members only when their join request is approved by a moderator of this community.'
  );

  return { styles, theme, label, description, subDescription };
}
