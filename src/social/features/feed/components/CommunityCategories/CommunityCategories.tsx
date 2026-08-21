import { Text, View, ViewProps, ScrollView } from 'react-native';
import { CommunityCategory } from '../../elements/CommunityCategory/CommunityCategory';
import { useStyles } from './styles';
import { ComponentID, PageID } from '../../../../enums';

type CommunityCategoriesProps = ViewProps & {
  categories?: Amity.Category[];
  pageId?: PageID;
  componentId?: ComponentID;
  allVisible?: boolean;
};

const MAX_VISIBLE_CATEGORIES = 2;

export function CommunityCategories({
  categories = [],
  allVisible,
  ...props
}: CommunityCategoriesProps) {
  const { styles } = useStyles();
  const visibleCategories = categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hiddenCategoriesCount = categories.length - MAX_VISIBLE_CATEGORIES;
  const showMoreText =
    hiddenCategoriesCount > 0 ? `+${hiddenCategoriesCount}` : '';
  const showMore = hiddenCategoriesCount > 0;

  // Badges are no longer capped at a fixed share of the row.
  //
  // The previous rules gave each badge maxWidth 50% (two badges) or 40% (three
  // or more), which ellipsized short labels like "Destinations" or even
  // "Loyalty" while the row still had free space - it depended purely on how
  // many categories a community happened to have. Each badge now takes its
  // natural width and shrinks (flexShrink on chipContainer) only when the row
  // genuinely overflows, so labels stay readable whenever they can fit.
  const getMaxWidthForItem = () => '100%';

  // Choose all categories or just the visible ones based on allVisible
  const displayCategories = allVisible ? categories : visibleCategories;
  // Only show more indicator if not showing all categories
  const displayShowMore = !allVisible && showMore;

  return (
    <View style={styles.container} {...props}>
      {allVisible ? (
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollableContainer}
        >
          {displayCategories.map((category, index) => (
            <CommunityCategory
              key={index}
              categoryName={category.name}
              maxWidth={getMaxWidthForItem()}
            />
          ))}
        </ScrollView>
      ) : (
        <>
          {displayCategories.map((category, index) => (
            <CommunityCategory
              key={index}
              categoryName={category.name}
              maxWidth={getMaxWidthForItem()}
            />
          ))}
          {displayShowMore && (
            <View style={styles.chipContainer}>
              <Text allowFontScaling={false} style={styles.chipText}>
                {showMoreText}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
