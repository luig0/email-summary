# Financial Summary Mailer

## Welcome note to visitors

Welcome! I have temporarily made this repository public to showcase my work. I am currently seeking employment opportunities and can be reached at jhcao.g1@gmail.com.

Visit me on LinkedIn: [linkedin.com/in/jhcao](https://linkedin.com/in/jhcao)

This application uses the Plaid API to connect to the user's financial accounts and provide a daily email summary of the previous day's transactions. I use it to monitor my accounts for fraudulent transactions and to keep track of my spending. I plan to extend the functionality to provide weekly and monthly summaries. Registration is not open to the public.

This README primarily serves as a refresher to myself to make it easier to add functionality after a development hiatus.

## Quickstart

```
# cd to project root (email-summary/)

# set up environment variables
cp sample.env.local .env.local # fill in values for the needed environment variables

# install dependencies
npm install

# create the db tables
npx ts-node src/scripts/CreateDatabase.ts

# start the application in development mode
npm run dev
```

## To make changes
- Create a new branch and submit changes via pull request
- There is a GitHub Action which builds the code and copies it to the EC2 instance. In order for this to work properly, the GitHub respository must have the following secrets configured:
  - `USERNAME`: the EC2 instance's username
  - `TARGET_DIR`: the directory on the EC2 instance where the build should be scp'd to
  - `HOST_DNS`: the publicly accessible IP/DNS address of the EC2 instance
  - `EC2_SSH_KEY`: the private key required for using SSH with the EC2 instance
- Once the build has been transferred to EC2, SSH into the EC2 instance and restart the application:
  - `pm2 restart email-summary`

The application uses GitHub Actions as a cron job to send curl requests to the server, which in turn triggers the daily/weekly/monthly mailer. In order for this to work , the GitHub repository must have the following secret configured:
  - `MAILER_TOKEN`: this is a unique string which is stored in the server's environment variables. It must match process.env.BEARER_TOKEN
  - `API_BASE_URL`: this is the base URL where the application is hosted

## Start a new instance of the application in pm2:
```
# the following assumes that the project is built and copied to EC2 using the included GitHub Action
cd /home/ubuntu/email-summary/
pm2 start emailsummary.pm2.config.js
```

## Test a local build in prod without committing to the repository
```
# connect to EC2 and delete the existing build
ssh jhcao.net
rm -rf /home/ubuntu/email-summary/.next
exit

# compress the .next directory, send it to EC2, and then extract on the server
# this is faster than scp'ing individual files
npm run build
tar czf - .next/ | ssh jhcao.net "cd /home/ubuntu/email-summary/ && tar xvzf -"

# connect to EC2 and restart the pm2 app
ssh jhcao.net
pm2 restart emailsummary
exit
```

## Production reference

The app is deployed on EC2 and managed by PM2.

The EC2 server uses nginx to manage routing to two discrete applications. The docker config files are here to mirror the EC2 prod config, enabling testing of the rate limiter functionality.

The application stores its data in a local SQLite database file at ./database/emailsummary.db.

# Next.js Boilerplate Readme

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
