type AppToastInput = {
  title: string;
  description?: string;
};

export function useAppToast() {
  const toast = useToast();

  const success = ({ title, description }: AppToastInput) =>
    toast.add({
      title,
      description,
      color: 'success',
      icon: 'i-lucide-circle-check-big'
    });

  const error = ({ title, description }: AppToastInput) =>
    toast.add({
      title,
      description,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    });

  const info = ({ title, description }: AppToastInput) =>
    toast.add({
      title,
      description,
      color: 'primary',
      icon: 'i-lucide-info'
    });

  return {
    success,
    error,
    info
  };
}
