export function getUserIdFromHeader(request: Request): string {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    throw new Error('User ID not found in request');
  }
  return userId;
}
