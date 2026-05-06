#!/bin/bash
# Génère le certificat SSL Let's Encrypt initial pour arka.michaelrichaud.fr
# À lancer une seule fois sur le VPS, après le premier `docker compose up -d`.
#
# Stratégie :
# 1. Le conteneur client tourne déjà en HTTP-only avec un nginx qui sert /.well-known/acme-challenge/
#    SAUF que par défaut notre nginx.conf est en HTTPS, ce qui plante au boot tant que les certs n'existent pas.
# 2. Donc on génère d'abord un cert auto-signé bidon pour faire démarrer nginx,
#    puis on demande le vrai cert à Let's Encrypt, puis on reload nginx.

set -e

DOMAIN="arka.michaelrichaud.fr"
EMAIL="michael.richaud.rm@gmail.com"

echo "→ Création d'un certificat dummy pour permettre à nginx de démarrer..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  sh -c 'mkdir -p /etc/letsencrypt/live/$DOMAIN && \
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
      -subj /CN=localhost'" certbot

echo "→ Démarrage de nginx avec le cert dummy..."
docker compose -f docker-compose.prod.yml up -d client

echo "→ Suppression du cert dummy..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "→ Demande du vrai certificat à Let's Encrypt..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    --agree-tos --no-eff-email \
    --force-renewal \
    -d $DOMAIN" certbot

echo "→ Reload nginx avec le vrai cert..."
docker kill -s HUP roulade-client

echo "✓ SSL en place. Vérifie https://$DOMAIN dans 30s."
