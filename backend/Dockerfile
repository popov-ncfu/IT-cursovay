FROM node:20-alpine

WORKDIR /app

EXPOSE 3000

# Scaffold-only container: keeps the service up until the real NestJS app exists.
CMD ["node", "-e", "console.log('backend scaffold: implement NestJS app next'); setInterval(()=>{}, 1<<30)"]

