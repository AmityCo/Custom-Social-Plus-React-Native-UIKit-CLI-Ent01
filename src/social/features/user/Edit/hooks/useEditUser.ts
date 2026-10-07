import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as z from 'zod';
import { useStyles } from '../styles';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '../../../../hooks/objects';
import { useMutation } from '@tanstack/react-query';
import { UserRepository } from '@amityco/ts-sdk-react-native';
import { RootStackParamList } from '../../../../../core/routes/RouteParamList';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../../../../core/stores/slices/toastSlice';
import { ERROR_CODE } from '../../../../../core/constants';
import { getProfileErrorMessage } from '../../../../utils/errors';
import { PageID } from '../../../../enums';
import { useAmityPage } from '../../../../hooks';
import { useState } from 'react';

const schema = z.object({
  image: z.custom<Amity.File<'image'>>().optional(),
  displayName: z.string().min(1).max(100),
  description: z.string().max(180).optional(),
});

type EditUserFormValues = z.infer<typeof schema>;

type UpdateUserPayload = Parameters<typeof UserRepository.updateUser>[1];

type UpdateUserResponse = Awaited<ReturnType<typeof UserRepository.updateUser>>;

export const useEditUser = (userId: string) => {
  const { styles, theme } = useStyles();
  const { accessibilityId } = useAmityPage({
    pageId: PageID.edit_user_profile_page,
  });

  const { user } = useUser({ userId, enabled: !!userId });
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const [isDisplayNameDisabled, setIsDisplayNameDisabled] = useState(false);

  const {
    watch,
    control,
    resetField,
    handleSubmit,
    formState: { isDirty, isSubmitting, isValid },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    values: {
      image: user?.avatar || null,
      displayName: user?.displayName || '',
      description: user?.description || '',
    },
  });

  const { mutateAsync } = useMutation<
    UpdateUserResponse,
    Error,
    UpdateUserPayload
  >({
    mutationKey: ['edit-user', userId],
    mutationFn: (payload) => UserRepository.updateUser(userId, payload),
    onSuccess: () => {
      navigation.goBack();
      showToast({
        type: 'success',
        message: 'Successfully updated your profile!',
      });
    },
    onError: (error) => {
      // This one also changes the form, not just the message: the server owns
      // the display name, so the field is locked and reset.
      if (error.message?.includes(ERROR_CODE.DISPLAY_NAME_UPDATE)) {
        setIsDisplayNameDisabled(true);
        resetField('displayName');
      }
      // Previously every other failure - a blocked word in the display name
      // most of all - fell through to one generic line.
      showToast({
        type: 'informative',
        message: getProfileErrorMessage(error),
      });
    },
  });

  const onSubmit = async (data: EditUserFormValues) => {
    await mutateAsync({
      avatarFileId: data.image?.fileId,
      ...(isDisplayNameDisabled ? {} : { displayName: data.displayName }),
      description: data.description,
    });
  };

  return {
    styles,
    theme,
    user,
    watch,
    control,
    handleSubmit,
    isDirty,
    isSubmitting,
    isValid,
    onSubmit,
    accessibilityId,
    isDisplayNameDisabled,
  };
};
