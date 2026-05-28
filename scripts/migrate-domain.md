# Bascule de domaine → roulademarseillaise.fr

Objectif : servir l'app sur **roulademarseillaise.fr** (+ `www` → apex) et faire de
**arka.michaelrichaud.fr** une redirection 301 permanente vers le nouveau domaine.

- VPS : `51.83.40.95` (IPv4) / `2001:41d0:305:2100::9420` (IPv6)
- Anciens certs : `arka.michaelrichaud.fr` (conservé, sert la redirection 301)
- Nouveau cert : `roulademarseillaise.fr` + `www.roulademarseillaise.fr`

L'ordre des étapes est important : **DNS → cert → déploiement nginx**. On émet le
certificat *avant* de déployer le nouveau `nginx.conf` (sinon nginx ne démarre pas,
le bloc HTTPS référençant un cert inexistant).

---

## 1. DNS (manager OVH — zone de roulademarseillaise.fr)

Dans **OVH → Noms de domaine → roulademarseillaise.fr → Zone DNS**, repointer vers le VPS
(le domaine pointe aujourd'hui sur la page de parking `51.91.236.255`) :

| Type  | Sous-domaine | Cible |
|-------|--------------|-------|
| A     | `@`          | `51.83.40.95` |
| AAAA  | `@`          | `2001:41d0:305:2100::9420` |
| A     | `www`        | `51.83.40.95` |
| AAAA  | `www`        | `2001:41d0:305:2100::9420` |

> Supprimer les anciens A/AAAA `@` et `www` qui pointent vers le parking.
> Laisser les enregistrements **MX / SPF / DKIM** liés à la boîte mail OVH
> (`noreply@roulademarseillaise.fr`) intacts — on ne touche qu'au web.

Ne **rien changer** sur `arka.michaelrichaud.fr` : il doit continuer à résoudre vers le
VPS pour servir la redirection et le renouvellement de son cert.

Vérifier la propagation (depuis ton mac) :
```bash
dig +short A roulademarseillaise.fr        # → 51.83.40.95
dig +short A www.roulademarseillaise.fr    # → 51.83.40.95
```
Attendre que ça renvoie bien l'IP du VPS (de quelques minutes à ~1h selon le TTL).

---

## 2. Récupérer le code à jour sur le VPS

```bash
ssh debian@arka.michaelrichaud.fr     # (l'host arka résout toujours)
cd /opt/roulade
git pull
```

> ⚠️ Ne pas encore lancer `deploy.sh` : le nouveau `nginx.conf` référence le cert
> roulade qui n'existe pas encore → nginx planterait. On émet le cert d'abord.

---

## 3. Émettre le certificat du nouveau domaine

La stack tourne encore avec l'ancien nginx (arka). Son bloc port 80 sert
`/var/www/certbot` pour **tous** les hosts, donc la validation HTTP-01 du nouveau
domaine passe sans toucher à la config :

```bash
./scripts/issue-roulade-cert.sh
```

Le script vérifie le DNS puis demande le cert `roulademarseillaise.fr` +
`www.roulademarseillaise.fr`. À la fin tu dois voir `Successfully received certificate`.

---

## 4. Mettre à jour l'environnement serveur

```bash
nano /opt/roulade/.env.production
```
Changer :
```
CLIENT_URL=https://roulademarseillaise.fr
```
(CORS API + Socket.IO et les liens emails/Stripe se basent dessus.)

---

## 5. Déployer le nouveau nginx + backend

```bash
./scripts/deploy.sh
```
Le cert roulade existe maintenant → nginx démarre avec les 4 blocs (app roulade,
www→apex, arka→roulade, ACME). `deploy.sh` rebuild aussi l'image client (donc le
nouveau `robots.txt` + SEO canonical pointant sur roulade) et redémarre le server
(nouveau `CLIENT_URL`).

---

## 6. Vérifications

```bash
# Le nouveau domaine sert l'app
curl -sI https://roulademarseillaise.fr | head -1            # 200

# www redirige vers l'apex
curl -sI https://www.roulademarseillaise.fr | grep -i location   # → https://roulademarseillaise.fr/

# l'ancien domaine redirige 301 vers le nouveau
curl -sI https://arka.michaelrichaud.fr | grep -iE "301|location"

# le sitemap pointe sur le nouveau domaine
curl -s https://roulademarseillaise.fr/sitemap.xml | head
```
Puis dans le navigateur : `https://roulademarseillaise.fr` → Home OK, cadenas SSL valide.
Tester un login + une création de salon (WebSocket sur le nouveau domaine).

---

## 7. Suites (hors infra)

- **Stripe** : dans le dashboard, créer/mettre à jour l'endpoint webhook vers
  `https://roulademarseillaise.fr/api/payments/webhook` (les 301 ne sont **pas** suivis
  pour les webhooks). Copier le nouveau `whsec_...` dans `.env.production`
  (`STRIPE_WEBHOOK_SECRET`) puis `docker compose -f docker-compose.prod.yml up -d server`.
  *(À ne faire que si Stripe est déjà actif ; en mode FEATURES_UNLOCKED=true ce n'est pas urgent.)*
- **Google Search Console / Bing** : ajouter la propriété `roulademarseillaise.fr`,
  resoumettre le sitemap. Utiliser l'outil de changement d'adresse depuis la propriété
  `arka.michaelrichaud.fr` (le 301 + le cert valide permettent à Google de transférer
  le ranking). Garder l'ancienne propriété le temps que tout migre.
- **Renouvellement auto** : rien à faire — le conteneur certbot (`certbot renew`) gère
  désormais les deux certs (arka + roulade) automatiquement, avec reload nginx via
  `--deploy-hook`.

---

## Rollback rapide

Si quelque chose casse pendant l'étape 5, revenir à l'ancien nginx :
```bash
cd /opt/roulade
git stash   # ou git checkout <commit-précédent> -- client/nginx.conf
docker compose -f docker-compose.prod.yml build client
docker compose -f docker-compose.prod.yml up -d client
```
L'ancien domaine `arka.michaelrichaud.fr` reste fonctionnel tant que son cert et son
bloc serveur existent.
