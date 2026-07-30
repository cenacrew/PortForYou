# Émulateurs Firebase conteneurisés (Firestore = Java, Storage = Node).
# Le JRE et les binaires des émulateurs sont figés DANS l'image :
# démarrage rapide, aucun Java ni firebase-tools sur la machine hôte.
#
#   docker compose up emulators
FROM node:24.18.1-slim@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends default-jre-headless curl \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@15

# Pré-télécharger les binaires des émulateurs dans l'image
RUN firebase setup:emulators:firestore \
  && firebase setup:emulators:storage \
  && firebase setup:emulators:ui

WORKDIR /config
EXPOSE 8090 9199 4000

HEALTHCHECK --interval=5s --retries=60 CMD curl -sf http://localhost:8090/ || exit 1

CMD ["firebase", "emulators:start", "--only", "firestore,storage", "--project", "portforyou-vsp"]
