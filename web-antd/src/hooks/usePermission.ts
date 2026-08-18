import { useProfileStore } from '@/stores';

const SUPER_PERMISSIONS = ['*:*:*', '*'];

const usePermission = (requireds: string[]) => {
  const { permissions } = useProfileStore();

  return permissions.some((permission) => {
    // Super admin has '*' or '*:*:*' permission, granting access to everything
    if (SUPER_PERMISSIONS.includes(permission)) return true;
    return requireds.includes(permission);
  });
};

export default usePermission;
