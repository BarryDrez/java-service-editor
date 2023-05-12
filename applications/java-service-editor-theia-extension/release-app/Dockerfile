ARG BASEIMAGE=iregistry.eur.ad.sag/origin/alpine-java:jdk17 
FROM ${BASEIMAGE} AS build
USER root
RUN mkdir -p /home/sag && \
    apk add --no-cache make pkgconfig gcc g++ libx11-dev libxkbfile-dev libsecret-dev 

WORKDIR /home/sag

USER root
RUN apk add --no-cache nodejs npm 
RUN npm install --global yarn

COPY package.json ./package.json
COPY .npmrc ./.npmrc

COPY SAG_RootCA2020.crt ./SAG_RootCA2020.crt
ENV NODE_EXTRA_CA_CERTS=/home/sag/SAG_RootCA2020.crt
#
RUN yarn install --production

FROM ${BASEIMAGE}

USER root
LABEL maintainer="Software Ag" 
RUN apk add --no-cache    libxkbfile-dev libsecret-dev 
RUN apk add --no-cache nodejs npm  

WORKDIR /opt/softwareag
RUN mkdir -p .theia && \
    chown -R sagadmin:sagadmin .theia 
COPY --chown=sagadmin:sagadmin settings.json .theia/settings.json
COPY --chown=sagadmin:sagadmin recentworkspace.json .theia/recentworkspace.json

RUN chmod g+rw /home && \
    mkdir -p /home/project && mkdir -p /home/sag && \
    chown -R sagadmin:sagadmin /home/sag && \
    chown -R sagadmin:sagadmin /home/project 
WORKDIR /home/project
RUN mkdir -p .theia  && \
    chown -R sagadmin:sagadmin .theia
COPY --chown=sagadmin:sagadmin settingsHome.json .theia/settings.json
RUN mkdir -p jars && \
    chown -R sagadmin:sagadmin jars
COPY --chown=sagadmin:sagadmin wm-isclient.jar jars/wm-isclient.jar
COPY --chown=sagadmin:sagadmin wm-isserver.jar jars/wm-isserver.jar

COPY --from=build --chown=sagadmin:sagadmin /home/sag/ /home/sag/
#VOLUME ["/home/project"]


WORKDIR /home/sag
USER sagadmin

# 

EXPOSE 3000
ENV SHELL=/bin/sh \
    THEIA_DEFAULT_PLUGINS=local-dir:/home/sag/node_modules/@jse/java-service-editor-app/plugins


WORKDIR /home/sag
ENTRYPOINT  node /home/sag/node_modules/@jse/java-service-editor-app/src-gen/backend/main.js /home/project --hostname=${JSE_HOST} --plugins=local-dir:/home/sag/node_modules/@jse/java-service-editor-app/plugins

