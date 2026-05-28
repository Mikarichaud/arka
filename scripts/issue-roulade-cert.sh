#!/bin/bash
# Émet le certificat Let's Encrypt pour roulademarseillaise.fr (+ www) lors de la
# bascule de domaine. À lancer UNE fois sur le VPS, AVANT de déployer le nouveau
# nginx.conf (qui référence ce cert).
#
# Pré-requis :
#   1. La zone DNS de roulademarseillaise.fr ET www.roulademarseillaise.fr pointe
#      déjà vers le VPS (A 51.83.40.95 / AAAA 2001:41d0:305:2100::9420), propagée.
#   2. La stack tourne déjà (ancien nginx arka) : son bloc port 80 sert
#      /var/www/certbot pour TOUS les hosts → la validation HTTP-01 passe sans
#      toucher à la config.
#
# Après ce script : déployer le nouveau nginx.conf via ./scripts/deploy.sh
# (le cert existe désormais, nginx démarrera sans erreur).

set -e

EMAIL="postmaster@roulademarseillaise.fr"

VPS_V4="51.83.40.95"
VPS_V6="2001:41d0:305:2100::9420"

echo "→ Vérification que le DNS du nouveau domaine pointe bien vers ce VPS..."
echo "  Attendu pour les DEUX : A=$VPS_V4  |  AAAA=$VPS_V6"
for host in roulademarseillaise.fr www.roulademarseillaise.fr; do
  v4=$(getent ahostsv4 "$host" | awk '{print $1}' | sort -u | tr '\n' ' ')
  v6=$(getent ahostsv6 "$host" | awk '{print $1}' | sort -u | tr '\n' ' ')
  echo "  $host → A: ${v4:-(aucun)} | AAAA: ${v6:-(aucun)}"
done
echo "  ⚠️  Let's Encrypt valide via IPv6 (AAAA) en priorité : A ET AAAA doivent pointer le VPS."
echo "  Ctrl-C dans les 8s si une valeur ne correspond pas."
sleep 8

echo "→ Demande du certificat à Let's Encrypt (webroot, stack en cours)..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    --agree-tos --no-eff-email \
    -d roulademarseillaise.fr -d www.roulademarseillaise.fr" certbot

echo "✓ Certificat émis. Déploie maintenant le nouveau nginx.conf :"
echo "    ./scripts/deploy.sh"
echo "  (ou : docker compose -f docker-compose.prod.yml build client && \\"
echo "        docker compose -f docker-compose.prod.yml up -d client)"
