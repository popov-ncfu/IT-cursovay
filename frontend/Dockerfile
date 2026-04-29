FROM node:20-alpine

WORKDIR /app

EXPOSE 5173

# Scaffold-only container: keeps the service up until the real React app exists.
CMD ["node", "-e", "console.log('frontend scaffold: implement React app next'); setInterval(()=>{}, 1<<30)"]

