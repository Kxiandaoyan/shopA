export function buildOrigin(host: string, protocol = "https") {
  return `${protocol}://${host}`;
}

export function buildReturnUrl(
  returnUrl: string,
  params: Record<string, string>,
) {
  const url = new URL(returnUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
