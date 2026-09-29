import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("healthz", "routes/healthz.ts"),
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.ts"),
  route("lists", "routes/lists.tsx"),
  route("lists/new", "routes/lists.new.tsx"),
  route("lists/:id", "routes/lists.show.tsx"),
  route("lists/:id/edit", "routes/lists.edit.tsx"),
  route("s/:token", "routes/share.tsx"),
] satisfies RouteConfig;
