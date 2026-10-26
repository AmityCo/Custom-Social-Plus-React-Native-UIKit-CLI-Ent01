import { RootStackParamList } from '../../../../../core/routes/RouteParamList';
import { CommunityRepository } from '@amityco/ts-sdk-react-native';
import { useToast } from '../../../../../core/stores/slices/toastSlice';
import useImagePicker from '../../../../hooks/useImagePicker';
import { useForm } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CommunityPrivacyOption } from '../../../../types';
import {
  defaultRequiresJoinApproval,
  toCommunityPrivacySettings,
} from '../utils';
import { useStyles } from '../styles';
import { useMutation } from '@tanstack/react-query';

const schema = z.object({
  image: z.custom<Amity.File<'image'>>().optional(),
  displayName: z.string().trim().min(1).max(30),
  description: z.string().trim().max(180).optional(),
  categories: z.array(z.custom<Amity.Category>()),
  privacy: z.enum(CommunityPrivacyOption),
  requiresJoinApproval: z.boolean(),
  members: z.array(z.custom<Amity.User>()),
});

type CreateCommunityFormValues = z.infer<typeof schema>;

type CreateCommunityPayload = Parameters<
  typeof CommunityRepository.createCommunity
>[0];

type CreateCommunityResponse = Awaited<
  ReturnType<typeof CommunityRepository.createCommunity>
>;

export const useCreateCommunity = () => {
  const { showToast } = useToast();
  const { styles, theme } = useStyles();
  const {
    watch,
    formState: { isDirty, isSubmitting, isValid },
    handleSubmit,
    setValue,
    control,
  } = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      image: null,
      displayName: '',
      description: '',
      categories: [],
      privacy: CommunityPrivacyOption.public,
      requiresJoinApproval: false,
      members: [],
    },
  });

  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'CreateCommunity'>
    >();

  const { openImageGallery, progress, openCamera } = useImagePicker();

  const values = watch();

  const { mutateAsync } = useMutation<
    CreateCommunityResponse,
    Error,
    CreateCommunityPayload
  >({
    mutationFn: CommunityRepository.createCommunity,
    onSuccess: ({ data }) => {
      navigation.navigate('CommunityProfilePage', {
        pop: 2,
        communityId: data?.communityId,
      });
      showToast({
        type: 'success',
        message: 'Successfully created community.',
      });
    },
    onError: () => {
      showToast({
        type: 'failed',
        message: 'Failed to create community. Please try again.',
      });
    },
  });

  const isPublic = values.privacy === CommunityPrivacyOption.public;

  const onChangePrivacy = (privacy: CommunityPrivacyOption) => {
    setValue('privacy', privacy, { shouldDirty: true, shouldValidate: true });
    // The switch can still change it afterwards.
    setValue('requiresJoinApproval', defaultRequiresJoinApproval(privacy), {
      shouldDirty: true,
    });
  };

  const onChangeRequiresJoinApproval = (requiresJoinApproval: boolean) => {
    setValue('requiresJoinApproval', requiresJoinApproval, {
      shouldDirty: true,
    });
  };

  const onSubmit = async () => {
    const userIds = isPublic ? [] : values.members.map((item) => item.userId);

    await mutateAsync({
      userIds,
      ...toCommunityPrivacySettings(
        values.privacy,
        values.requiresJoinApproval
      ),
      description: values.description,
      displayName: values.displayName,
      avatarFileId: values.image?.fileId,
      categoryIds: values.categories.map((category) => category.categoryId),
    });
  };

  return {
    isDirty,
    isSubmitting,
    isValid,
    handleSubmit,
    setValue,
    control,
    onSubmit,
    isPublic,
    onChangePrivacy,
    onChangeRequiresJoinApproval,
    openImageGallery,
    progress,
    openCamera,
    styles,
    theme,
    navigation,
    values,
  };
};
