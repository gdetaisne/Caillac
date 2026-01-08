export function jsonError(message: string, status = 400) {
  return Response.json({ message }, { status });
}

export function serverError(err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }
  return Response.json({ message: "Internal Server Error" }, { status: 500 });
}

