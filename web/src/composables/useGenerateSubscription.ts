import { useFormState } from './useFormState';
import { useGeneratedLinks } from './useGeneratedLinks';

export function useGenerateSubscription() {
  const form = useFormState();
  const generated = useGeneratedLinks();

  function generate(): boolean {
    if (!form.generateUrl()) return false;
    generated.record(form.builtUrl.value, form.state);
    return true;
  }

  return { form, generated, generate };
}
