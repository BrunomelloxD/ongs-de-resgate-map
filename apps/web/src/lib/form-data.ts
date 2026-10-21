/** A text field of a submitted form; a missing field or a file counts as ''. */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
}
