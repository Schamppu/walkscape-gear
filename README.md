# Walkscape gear tool

## Setup docker access
To start development with docker, you need to have correct permissions set up.
create a new PAT in github with read:packages and repo access under 
GitHub -> Settings -> Developer settings -> Personal access tokens -> Use classic token

give that PAT to docker
```
docker login ghcr.io
```

When prompted:
Username -> your GitHub username
Password -> the PAT


## Running with docker for development
docker-compose --env-file .env.development --profile dev up

## Run default
docker-compose --env-file .env.production --profile prod up -d