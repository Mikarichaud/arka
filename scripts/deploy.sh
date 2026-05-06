#!/bin/bash
# Déploiement sur le VPS : pull du repo + rebuild + restart sans downtime perceptible.
# À lancer DEPUIS le VPS dans /opt/roulade (ou ton chemin de checkout).

set -e

echo "→ Pull des derniers changements..."
git pull origin main

echo "→ Rebuild des images Docker..."
docker compose -f docker-compose.prod.yml build

echo "→ Restart des services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "→ Nettoyage des images dangling..."
docker image prune -f

echo "→ État des services :"
docker compose -f docker-compose.prod.yml ps

echo "✓ Déploiement terminé."
