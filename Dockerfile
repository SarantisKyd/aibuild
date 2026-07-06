FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@9.15.9
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server build
EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
