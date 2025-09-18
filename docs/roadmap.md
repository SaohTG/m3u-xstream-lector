# Plan de développement

## MVP (ce repo)
- Auth Nova (register/login) + cookies httpOnly
- Refresh token + multi-appareils (Device)
- Onboarding Xtream (chiffrement, persistance)
- Pages : Accueil, Films, Séries, Live, Ma Liste, Détail, Watch, Paramètres
- TMDB reviews (texte)
- Lecteur HLS

**Critères d’acceptation**
- Sans compte Nova **ET** sans liaison Xtream → aucun contenu visible.
- L’utilisateur ne ressaisit pas Xtream à chaque visite (cookies + refresh).
- Les images proviennent **exclusivement** de l’instance Xtream liée.

## Beta
- EPG live (proxy `player_api.php?action=get_simple_data_table&stream_id=`)
- “Continuer à regarder” + reprise position
- Watchlist
- Rate limiting + audit logs
- Hardening sécurité (headers + CSP stricte)

## v1 SaaS
- Facturation (Stripe), gestion d’équipe B2B
- Admin opérateur (branding, SLA)
- Analytics (Mixpanel/autohébergé), A/B tests
- Multi-profils, contrôle parental, recherches avancées
