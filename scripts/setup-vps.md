# Setup VPS OVH (Debian 12 + Docker)

Commandes à lancer **une seule fois** sur le VPS au premier déploiement.
Le template OVH "Debian 12 - Docker" inclut déjà Docker Engine + Docker Compose v2.
Domaine cible : **arka.michaelrichaud.fr**.

---

## 1. Préparation

```bash
# Connexion en SSH
ssh debian@arka.michaelrichaud.fr

# Mise à jour
sudo apt update && sudo apt upgrade -y

# Outils utiles
sudo apt install -y git ufw curl gnupg

# Vérifier que Docker est bien là (préinstallé sur le template OVH)
docker --version
docker compose version

# Ajoute ton user au groupe docker pour éviter sudo (logout/login après)
sudo usermod -aG docker $USER
```

> Si pour une raison ou une autre Docker n'est pas installé, suis les instructions officielles : https://docs.docker.com/engine/install/debian/

---

## 2. Firewall UFW

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP (Certbot challenge + redirect)
sudo ufw allow 443/tcp       # HTTPS
sudo ufw --force enable
sudo ufw status
```

Mongo n'est **pas** ouvert sur le firewall — il bind uniquement sur 127.0.0.1.

---

## 3. Installation MongoDB 7 community (apt)

```bash
# Repo officiel MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl enable --now mongod
sudo systemctl status mongod   # doit être "active (running)"
```

---

## 4. Sécurisation Mongo : bind sur 0.0.0.0 (Docker bridge), auth activée

Pour que le conteneur server puisse joindre Mongo via `host.docker.internal`, Mongo doit binder sur l'interface du bridge Docker (ou simplement `0.0.0.0`, le firewall UFW protège déjà). On bloque l'accès externe via UFW (déjà fait, port 27017 pas ouvert).

```bash
sudo nano /etc/mongod.conf
```

Modifier la section `net` :

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,172.17.0.1   # localhost + bridge Docker par défaut

security:
  authorization: enabled
```

Avant d'activer l'auth, créer l'admin :

```bash
mongosh

# Dans mongosh :
// Les deux users sont créés dans la DB "admin" pour rester cohérents avec authSource=admin
use admin

db.createUser({
  user: "admin",
  pwd: "REMPLACE_PAR_MOT_DE_PASSE_FORT_ADMIN",
  roles: [{ role: "root", db: "admin" }]
})

db.createUser({
  user: "roulade",
  pwd: "REMPLACE_PAR_MOT_DE_PASSE_FORT_ROULADE",
  roles: [{ role: "readWrite", db: "roulade-marseillaise" }]
})

exit
```

Puis activer l'auth :

```bash
sudo systemctl restart mongod
```

Test connexion authentifiée :
```bash
mongosh "mongodb://roulade:MOT_DE_PASSE@127.0.0.1:27017/roulade-marseillaise?authSource=admin"
# doit pouvoir lire/écrire dans la DB roulade-marseillaise
```

---

## 5. Backup quotidien Mongo (cron)

```bash
sudo mkdir -p /var/backups/mongo
sudo chown debian:debian /var/backups/mongo
sudo chown mika:mika /var/backups/mongo  

# Script de backup
sudo nano /usr/local/bin/mongo-backup.sh
```

Contenu :

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
DEST=/var/backups/mongo
mongodump --uri "mongodb://admin:MOT_DE_PASSE_ADMIN@127.0.0.1:27017/?authSource=admin" \
  --gzip --archive="$DEST/roulade-$DATE.gz"
# Rotation : garde les 7 derniers
ls -t $DEST/roulade-*.gz | tail -n +8 | xargs -r rm
```

```bash
sudo chmod +x /usr/local/bin/mongo-backup.sh


# Cron quotidien à 03:30
sudo crontab -e
```

Ajouter :
```
30 3 * * * /usr/local/bin/mongo-backup.sh >/dev/null 2>&1
```
# Test manuel pour vérifier que ça marche                                                      
sudo /usr/local/bin/mongo-backup.sh
ls -la /var/backups/mongo/                                                                     
         
---

## 6. Cloner le repo et préparer .env.production

```bash
sudo mkdir -p /opt/roulade
sudo chown debian:debian /opt/roulade
cd /opt/roulade

git clone <ton-repo.git> .
# (ou git clone git@github.com:...)

cp .env.production.example .env.production
nano .env.production
# Remplir toutes les valeurs (Mongo URI avec le password créé,
# JWT_SECRET avec `openssl rand -hex 64`, Cloudinary, Stripe live keys, etc.)

# Permissions strictes
chmod 600 .env.production
```

---

## 7. Premier démarrage + SSL

```bash
cd /opt/roulade

# Build et start des services (mais SSL pas encore en place)
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d server certbot

# Génération du cert SSL
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh

# Tout devrait être OK
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50
```

Vérifie : https://arka.michaelrichaud.fr → la page Home doit s'afficher.

---

## 8. Seeds initiaux

```bash
# Catégories par défaut (marseillais, amis, sportif, etc.)
docker exec roulade-server node scripts/seed-categories.js

# (les packs officiels et cosmétiques se créent depuis l'Espace Gaté en UI)
```

---

## 9. Création du compte gaté

1. Visite https://arka.michaelrichaud.fr/login → crée ton compte normalement.
2. Promouvoir en gaté :

```bash
mongosh "mongodb://admin:MOT_DE_PASSE_ADMIN@127.0.0.1:27017/?authSource=admin"

use roulade-marseillaise
db.users.updateOne({ username: "TON_PSEUDO" }, { $set: { role: "gate" } })
exit
```

3. Déconnexion / reconnexion sur le site → tu vois "Espace Gaté" dans ton profil.
4. Crée tes packs officiels et tes cosmétiques depuis l'UI gaté.

---

## 10. Stripe en mode LIVE

Dans le dashboard Stripe (mode Live, pas Test) :
1. Récupère `sk_live_...` → `STRIPE_SECRET_KEY` dans `.env.production`
2. Crée 2 produits "Premium Mensuel" / "Premium Annuel" avec leurs Prices, et copie les IDs dans `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`
3. Crée un endpoint webhook `https://arka.michaelrichaud.fr/api/payments/webhook` avec les events :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copie le signing secret `whsec_...` → `STRIPE_WEBHOOK_SECRET`
5. Restart : `docker compose -f docker-compose.prod.yml up -d server`

---

## Mises à jour ultérieures

Pour redéployer après un push :
```bash
cd /opt/roulade
./scripts/deploy.sh
```
