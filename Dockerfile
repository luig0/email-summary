FROM ubuntu:22.10

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y curl
RUN apt-get install -y nginx
RUN curl -fsSL https://deb.nodesource.com/setup_19.x | bash - && \
  apt-get install -y nodejs

RUN rm /etc/nginx/sites-enabled/default
COPY ./docker_setup/nginx.conf /etc/nginx/sites-enabled/default

WORKDIR /app

VOLUME ["/app"]
