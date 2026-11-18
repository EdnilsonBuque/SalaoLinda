<template>
  <main class="home-page">
    <div class="home-shell">
      <header class="home-nav">
        <RouterLink aria-label="Salão Linda, início" class="brand" to="/">
          <span class="brand-mark"><v-icon icon="mdi-content-cut" size="21" /></span>

          <span class="brand-copy">
            <strong>Salão Linda</strong>
            <small>BELEZA &amp; CUIDADO</small>
          </span>
        </RouterLink>

        <nav aria-label="Navegação principal" class="desktop-nav">
          <RouterLink to="/servicos">Serviços</RouterLink>
          <a href="#sobre">O salão</a>
        </nav>

        <div class="nav-actions">
          <span v-if="auth.user" class="welcome-note">Olá, {{ firstName }}</span>
          <RouterLink v-if="auth.user" class="nav-login" to="/servicos">Explorar</RouterLink>
          <RouterLink v-else class="nav-login" to="/login">Entrar</RouterLink>

          <v-btn
            v-if="!auth.user"
            class="nav-cta"
            color="primary"
            rounded="pill"
            to="/registo"
            variant="flat"
          >
            Criar conta
          </v-btn>
        </div>
      </header>

      <section aria-labelledby="hero-title" class="hero">
        <div class="hero-copy">
          <p class="eyebrow"><span class="eyebrow-dot" /> O teu espaço de beleza em Maputo</p>
          <h1 id="hero-title">Beleza, com <em>cuidado.</em></h1>

          <p class="hero-description">
            Cabelo, manicure e pedicure num espaço acolhedor, com atenção a cada detalhe.
          </p>

          <div class="hero-actions">
            <v-btn
              class="hero-primary"
              color="primary"
              rounded="pill"
              size="large"
              to="/servicos"
              variant="flat"
            >
              Explorar serviços
              <v-icon end icon="mdi-arrow-right" />
            </v-btn>

            <a class="hero-link" href="#como-funciona">
              Como funciona <v-icon icon="mdi-arrow-down" size="16" />
            </a>
          </div>

          <div class="hero-note">
            <span class="note-icon"><v-icon icon="mdi-calendar-check-outline" size="19" /></span>
            <span><strong>Agende com facilidade</strong><small>Escolha o serviço e o horário ideal</small></span>
          </div>
        </div>

        <div class="hero-art">
          <div aria-hidden="true" class="hero-artwork">
            <div class="artwork-copy">
              <span class="artwork-monogram">SL</span>
              <span class="artwork-rule" />
              <span class="artwork-label">SALÃO LINDA</span>
              <span class="artwork-subtitle">CABELO · MÃOS · PÉS</span>
            </div>
          </div>

          <div class="art-caption">
            <span class="caption-icon"><v-icon icon="mdi-check" size="18" /></span>
            <span><strong>O seu cuidado,</strong><small>ao seu ritmo.</small></span>
          </div>
        </div>

      </section>

      <section aria-label="Vantagens" class="promise-row">
        <div class="promise-item">
          <span class="promise-icon"><v-icon icon="mdi-heart-outline" /></span>
          <span><strong>Cabelo &amp; estilo</strong><small>Cortes, penteados e tranças</small></span>
        </div>

        <div class="promise-divider" />

        <div class="promise-item">
          <span class="promise-icon"><v-icon icon="mdi-hand-heart-outline" /></span>
          <span><strong>Manicure</strong><small>Cuidado e cor para as mãos</small></span>
        </div>

        <div class="promise-divider" />

        <div class="promise-item">
          <span class="promise-icon"><v-icon icon="mdi-foot-print" /></span>
          <span><strong>Pedicure</strong><small>Conforto e cuidado para os pés</small></span>
        </div>
      </section>

      <section id="servicos" aria-labelledby="services-title" class="services-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">SERVIÇOS DO SALÃO</p>
            <h2 id="services-title">Um cuidado para cada detalhe</h2>
            <p class="section-description">Conheça os serviços e encontre o cuidado ideal para si.</p>
          </div>

          <RouterLink class="all-services-link" to="/servicos">
            Ver todos os serviços <v-icon icon="mdi-arrow-right" size="17" />
          </RouterLink>
        </div>

        <div v-if="loading" class="service-state" role="status">
          <v-progress-circular color="primary" indeterminate size="28" />
          <span>A carregar os serviços...</span>
        </div>

        <v-alert v-else-if="error" class="service-error" type="error" variant="tonal">
          <div class="error-content">
            <span>{{ error }}</span>
            <v-btn size="small" variant="text" @click="loadServices">Tentar novamente</v-btn>
          </div>
        </v-alert>

        <div v-else-if="featuredServices.length > 0" class="service-grid">
          <article v-for="(service, index) in featuredServices" :key="service.id" class="service-card">
            <div class="service-visual" :class="`service-visual-${index + 1}`">
              <img
                v-if="service.imagePath"
                :alt="service.name"
                class="service-photo"
                :src="serviceImageUrl(service.imagePath)"
              >

              <v-icon v-else :icon="serviceIcon(service.name)" size="34" />
              <span class="service-number">0{{ index + 1 }}</span>
            </div>

            <div class="service-card-body">
              <div class="service-title-row">
                <h3>{{ service.name }}</h3>

                <span class="service-duration">
                  <v-icon icon="mdi-clock-outline" size="14" />
                  {{ service.durationMinutes }} min
                </span>
              </div>

              <p v-if="service.description" class="service-description">{{ service.description }}</p>

              <div class="service-card-footer">
                <strong class="service-price">{{ formatPrice(service.price) }}</strong>

                <RouterLink :aria-label="`Marcar ${service.name}`" class="service-book" :to="`/marcar/${service.id}`">
                  <v-icon icon="mdi-arrow-up-right" size="18" />
                </RouterLink>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="service-empty">
          <span class="empty-icon"><v-icon icon="mdi-content-cut" size="22" /></span>
          <div><strong>Novos serviços em breve</strong><p>Volte mais tarde para conhecer as novidades do salão.</p></div>
        </div>
      </section>

      <section id="como-funciona" aria-labelledby="how-title" class="how-section">
        <div class="how-intro">
          <p class="section-kicker">AGENDAMENTO SIMPLES</p>
          <h2 id="how-title">Agende em três passos</h2>
          <p>Escolha o serviço, o melhor horário e acompanhe o pedido na aplicação.</p>
        </div>

        <div class="steps-grid">
          <article class="step-card">
            <span class="step-icon"><v-icon icon="mdi-magnify" size="23" /></span>
            <span class="step-number">PASSO 01</span>
            <h3>Escolha o serviço</h3>
            <p>Explore as opções de cabelo, manicure e pedicure.</p>
          </article>

          <article class="step-card">
            <span class="step-icon"><v-icon icon="mdi-calendar-month-outline" size="23" /></span>
            <span class="step-number">PASSO 02</span>
            <h3>Escolha o horário</h3>
            <p>Consulte os horários disponíveis e selecione o mais conveniente.</p>
          </article>

          <article class="step-card">
            <span class="step-icon"><v-icon icon="mdi-check-decagram-outline" size="23" /></span>
            <span class="step-number">PASSO 03</span>
            <h3>Acompanhe o pedido</h3>
            <p>Consulte o estado da sua marcação diretamente na aplicação.</p>
          </article>
        </div>
      </section>

      <section id="sobre" class="about-banner">
        <div aria-hidden="true" class="about-flower"><v-icon icon="mdi-flower-tulip-outline" size="38" /></div>

        <div class="about-copy">
          <p class="section-kicker">SALÃO LINDA · MAPUTO</p>
          <h2>Um espaço para te sentires bem, por dentro e por fora.</h2>
          <p>Tranças, cabelo, unhas e maquilhagem — encontra tudo num só lugar e cuida de ti ao teu ritmo.</p>
        </div>

        <div class="about-hours">
          <span class="hours-icon"><v-icon icon="mdi-clock-outline" size="19" /></span>
          <span><small>Estamos à tua espera</small><strong>Seg. a sáb. · 09h–18h</strong></span>
        </div>
      </section>

      <footer class="home-footer">
        <RouterLink class="footer-brand" to="/">Salão Linda</RouterLink>
        <span>Cuidado profissional, com atenção a cada detalhe.</span>
        <RouterLink to="/servicos">Agendar um serviço <v-icon icon="mdi-arrow-right" size="15" /></RouterLink>
      </footer>
    </div>
  </main>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import api from '@/services/api'
  import { formatPrice, serviceIcon, serviceImageUrl } from '@/services/formatters'
  import { useAuthStore } from '@/stores/auth'

  const auth = useAuthStore()
  const services = ref([])
  const loading = ref(true)
  const error = ref('')
  const featuredServices = computed(() => services.value.slice(0, 3))
  const firstName = computed(() => auth.user?.name?.trim().split(/\s+/, 1)[0] || 'Olá')

  async function loadServices () {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/services')
      services.value = data.services
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível carregar os serviços. Verifica a ligação e tenta novamente.'
    } finally {
      loading.value = false
    }
  }

  onMounted(loadServices)
</script>

<style scoped>
.home-page {
  --ink: #30282a;
  --muted: #766f6a;
  --wine: #624650;
  --rose: #d8cbb8;
  --paper: #fffdfa;
  min-height: 100%;
  padding: 0 28px 28px;
  color: var(--ink);
  background:
    radial-gradient(ellipse at 82% 9%, rgba(218, 204, 184, 0.2), transparent 25%),
    #fffdfa;
  font-family: Roboto, sans-serif;
}

.home-shell {
  width: min(1160px, 100%);
  margin: 0 auto;
}

.home-nav {
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eae4dc;
}

.brand,
.footer-brand {
  display: inline-flex;
  align-items: center;
  color: var(--ink);
  text-decoration: none;
}

.brand {
  gap: 11px;
}

.brand-mark,
.note-icon,
.promise-icon,
.step-icon,
.hours-icon,
.caption-icon,
.empty-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--wine);
  background: #f7f2e9;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border: 1px solid #d8cbb8;
  border-radius: 50%;
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.brand-copy strong,
.footer-brand {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 19px;
  font-weight: 600;
}

.brand-copy small {
  color: #8d7b69;
  font-size: 9px;
  letter-spacing: 1.8px;
}

.desktop-nav,
.nav-actions {
  display: flex;
  align-items: center;
}

.desktop-nav {
  gap: 34px;
  margin-left: 80px;
}

.desktop-nav a,
.nav-login {
  color: #655b55;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: color 160ms ease;
}

.desktop-nav a:hover,
.nav-login:hover,
.all-services-link:hover,
.home-footer a:hover {
  color: var(--wine);
}

.nav-actions {
  gap: 22px;
}

.welcome-note {
  color: var(--muted);
  font-size: 13px;
}

.nav-cta {
  min-height: 40px;
  padding: 0 19px;
  font-size: 12px;
  letter-spacing: 0;
}

.hero {
  position: relative;
  display: grid;
  min-height: 440px;
  grid-template-columns: 1.04fr 0.96fr;
  align-items: center;
  overflow: hidden;
  margin: 24px 0 0;
  padding: 30px 7.3%;
  border: 1px solid #e8dfd4;
  border-radius: 10px;
  background:
    radial-gradient(ellipse at 84% 47%, rgba(255, 255, 255, 0.72), transparent 34%),
    linear-gradient(112deg, #f6f2ec 2%, #efe8de 57%, #e8dfd4 100%);
}

.hero-copy {
  z-index: 1;
  max-width: 470px;
  padding: 20px 0 22px;
}

.eyebrow,
.section-kicker {
  margin: 0;
  color: var(--wine);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.65px;
  text-transform: uppercase;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9a8061;
  box-shadow: 0 0 0 4px rgba(154, 128, 97, 0.12);
}

.hero h1 {
  max-width: 440px;
  margin: 20px 0 12px;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(42px, 5.2vw, 64px);
  font-weight: 500;
  letter-spacing: -1.7px;
  line-height: 1.02;
}

.hero h1 em {
  color: var(--wine);
  font-weight: 500;
}

.hero-description {
  max-width: 405px;
  margin: 0;
  color: #655c57;
  font-size: 14px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 23px;
  margin-top: 25px;
}

.hero-primary {
  min-height: 46px;
  padding: 0 19px;
  font-size: 12px;
  letter-spacing: 0;
}

.hero-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #655b55;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
}

.hero-note {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 30px;
}

.note-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #d8cbb8;
  border-radius: 50%;
}

.hero-note > span:last-child,
.art-caption > span:last-child,
.promise-item > span:last-child,
.about-hours > span:last-child {
  display: grid;
  gap: 3px;
}

.hero-note strong,
.promise-item strong {
  color: #46353d;
  font-size: 11px;
  font-weight: 600;
}

.hero-note small,
.promise-item small {
  color: var(--muted);
  font-size: 10px;
}

.hero-art {
  position: relative;
  display: grid;
  min-height: 360px;
  align-items: center;
  justify-items: center;
}

.hero-artwork {
  position: relative;
  display: grid;
  width: min(100%, 390px);
  aspect-ratio: 0.92;
  overflow: hidden;
  place-items: center;
  border: 1px solid rgba(255, 253, 250, 0.72);
  border-radius: 48% 48% 7px 7px;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.1), transparent 48%),
    linear-gradient(155deg, #6e5960, #3b2e33 88%);
  box-shadow: 0 22px 42px rgba(48, 40, 42, 0.16);
}

.hero-artwork::before {
  position: absolute;
  inset: 20px;
  border: 1px solid rgba(216, 203, 184, 0.56);
  border-radius: 48% 48% 4px 4px;
  content: '';
}

.hero-artwork::after {
  position: absolute;
  right: 15%;
  bottom: 21%;
  left: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(216, 203, 184, 0.8), transparent);
  content: '';
}

.artwork-copy {
  display: grid;
  justify-items: center;
  color: #f5efe5;
}

.artwork-monogram {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(105px, 16vw, 174px);
  font-weight: 400;
  letter-spacing: -0.12em;
  line-height: 1;
  transform: translateX(-0.06em);
}

.artwork-rule {
  width: 35px;
  height: 1px;
  margin: 20px 0 13px;
  background: #c9ad84;
}

.artwork-label {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 13px;
  letter-spacing: 3px;
}

.artwork-subtitle {
  margin-top: 7px;
  color: #d5c6b3;
  font-size: 8px;
  letter-spacing: 2.4px;
}

.art-caption {
  position: absolute;
  right: 2%;
  bottom: 17px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 15px 11px 11px;
  border: 1px solid rgba(222, 211, 198, 0.9);
  border-radius: 6px;
  background: rgba(255, 253, 250, 0.9);
  box-shadow: 0 9px 24px rgba(48, 40, 42, 0.08);
}

.caption-icon {
  width: 31px;
  height: 31px;
  border-radius: 50%;
}

.art-caption strong {
  color: #4c3b40;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 12px;
  font-weight: 600;
}

.art-caption small {
  color: var(--muted);
  font-size: 10px;
}

.promise-row {
  display: flex;
  min-height: 98px;
  align-items: center;
  justify-content: center;
  gap: clamp(26px, 6vw, 82px);
  border-bottom: 1px solid #eae4dc;
}

.promise-item {
  display: flex;
  align-items: center;
  gap: 11px;
}

.promise-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f7f2e9;
}

.promise-icon :deep(.v-icon) {
  font-size: 19px;
}

.promise-divider {
  width: 1px;
  height: 34px;
  background: #e8dfd4;
}

.services-section {
  padding: 62px 0 58px;
  scroll-margin-top: 24px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 25px;
}

.section-heading h2,
.how-intro h2,
.about-copy h2 {
  margin: 9px 0 7px;
  color: var(--ink);
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(25px, 3vw, 33px);
  font-weight: 500;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.section-description,
.how-intro > p:last-child {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.all-services-link {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding-bottom: 5px;
  color: #65504a;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.service-card {
  overflow: hidden;
  border: 1px solid #f0e9e7;
  border-radius: 7px;
  background: #fff;
  transition: box-shadow 180ms ease, transform 180ms ease;
}

.service-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(73, 44, 56, 0.08);
}

.service-visual {
  position: relative;
  display: grid;
  height: 142px;
  overflow: hidden;
  place-items: center;
  color: #765d4a;
  background: linear-gradient(135deg, #eee7dd, #ded3c5);
}

.service-visual-2 {
  color: #695b4d;
  background: linear-gradient(135deg, #ece8df, #d9d2c5);
}

.service-visual-3 {
  color: #624650;
  background: linear-gradient(135deg, #eee4df, #dccdc5);
}

.service-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.service-number {
  position: absolute;
  top: 12px;
  left: 13px;
  color: rgba(60, 48, 46, 0.56);
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 12px;
}

.service-card-body {
  padding: 16px 17px 15px;
}

.service-title-row,
.service-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}

.service-title-row h3 {
  overflow: hidden;
  margin: 0;
  color: #45353c;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-duration {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
  color: #8a7b80;
  font-size: 10px;
}

.service-description {
  display: -webkit-box;
  min-height: 34px;
  overflow: hidden;
  margin: 8px 0 12px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.service-card-footer {
  padding-top: 11px;
  border-top: 1px solid #f3eeee;
}

.service-price {
  color: #684456;
  font-size: 13px;
  font-weight: 700;
}

.service-book {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #d8cbb8;
  border-radius: 50%;
  color: var(--wine);
  background: #f7f2e9;
  text-decoration: none;
  transition: color 150ms ease, background 150ms ease;
}

.service-book:hover {
  color: #fff;
  background: var(--wine);
}

.service-state,
.service-empty {
  display: flex;
  min-height: 145px;
  align-items: center;
  justify-content: center;
  gap: 13px;
  border: 1px solid #e9e3db;
  border-radius: 7px;
  color: var(--muted);
  background: #fff;
  font-size: 12px;
}

.service-empty {
  justify-content: flex-start;
  padding: 25px;
}

.empty-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

.service-empty strong {
  color: #503c45;
  font-size: 13px;
}

.service-empty p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 11px;
}

.service-error {
  max-width: 100%;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.how-section {
  display: grid;
  grid-template-columns: 0.76fr 1.6fr;
  align-items: center;
  gap: 40px;
  padding: 39px 38px;
  border: 1px solid #f1e9e7;
  border-radius: 7px;
  background: #f7f4ef;
  scroll-margin-top: 24px;
}

.how-intro h2 {
  max-width: 280px;
  font-size: 28px;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 19px;
}

.step-card {
  min-width: 0;
}

.step-icon {
  width: 39px;
  height: 39px;
  margin-bottom: 15px;
  border-radius: 50%;
}

.step-number {
  display: block;
  margin-bottom: 6px;
  color: #9a8061;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
}

.step-card h3 {
  margin: 0 0 6px;
  color: #49363f;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 15px;
  font-weight: 600;
}

.step-card p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.65;
}

.about-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  margin-top: 28px;
  padding: 25px 31px;
  border: 1px solid #e8dfd4;
  border-radius: 7px;
  background: linear-gradient(105deg, #f3eee6, #faf8f3);
  scroll-margin-top: 24px;
}

.about-flower {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid #ded2c2;
  border-radius: 50%;
  color: #765d4a;
  background: rgba(255, 255, 255, 0.53);
}

.about-copy h2 {
  max-width: 520px;
  margin: 7px 0 5px;
  font-size: 21px;
}

.about-copy > p:last-child {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.about-copy .section-kicker {
  font-size: 9px;
}

.about-hours {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border: 1px solid rgba(222, 211, 198, 0.8);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.63);
}

.hours-icon {
  width: 33px;
  height: 33px;
  border-radius: 50%;
}

.about-hours small {
  color: var(--muted);
  font-size: 9px;
}

.about-hours strong {
  color: #503d46;
  font-size: 11px;
  white-space: nowrap;
}

.home-footer {
  display: flex;
  min-height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: var(--muted);
}

.footer-brand {
  color: #684456;
  font-size: 16px;
}

.home-footer > span {
  font-size: 10px;
}

.home-footer a:last-child {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #735665;
  font-size: 10px;
  font-weight: 600;
  text-decoration: none;
}

@media (min-width: 1300px) {
  .hero {
    min-height: 470px;
  }

  .hero-artwork {
    width: 460px;
  }
}

@media (max-width: 800px) {
  .home-page {
    padding-right: 20px;
    padding-left: 20px;
  }

  .hero {
    min-height: 390px;
    grid-template-columns: 1.05fr 0.95fr;
    padding-right: 5%;
    padding-left: 6%;
  }

  .hero h1 {
    font-size: clamp(39px, 6vw, 54px);
  }

  .hero-art {
    min-height: 320px;
  }

  .hero-artwork {
    width: 115%;
    max-width: 360px;
  }

  .promise-row {
    gap: 22px;
  }

  .promise-item {
    gap: 8px;
  }

  .promise-icon {
    width: 34px;
    height: 34px;
  }

  .how-section {
    grid-template-columns: 1fr;
    gap: 25px;
    padding: 30px;
  }

  .how-intro h2 {
    max-width: 400px;
  }
}

@media (max-width: 600px) {
  .home-page {
    padding: 0 15px calc(22px + env(safe-area-inset-bottom));
  }

  .home-nav {
    min-height: 70px;
  }

  .brand-mark {
    width: 37px;
    height: 37px;
  }

  .brand-copy strong {
    font-size: 17px;
  }

  .brand-copy small {
    font-size: 8px;
  }

  .desktop-nav,
  .welcome-note {
    display: none;
  }

  .nav-actions {
    gap: 14px;
  }

  .nav-login {
    font-size: 12px;
  }

  .nav-cta {
    min-height: 36px;
    padding: 0 14px;
    font-size: 11px;
  }

  .hero {
    min-height: 0;
    grid-template-columns: 1fr;
    margin-top: 15px;
    padding: 28px 23px 15px;
    border-radius: 8px;
  }

  .hero-copy {
    padding: 7px 0 0;
  }

  .eyebrow {
    font-size: 8px;
    letter-spacing: 1.35px;
  }

  .hero h1 {
    max-width: 340px;
    margin: 16px 0 10px;
    font-size: clamp(42px, 11vw, 54px);
    letter-spacing: -1.2px;
  }

  .hero-description {
    max-width: 360px;
    font-size: 12px;
    line-height: 1.7;
  }

  .hero-actions {
    gap: 15px;
    margin-top: 20px;
  }

  .hero-primary {
    min-height: 43px;
    padding: 0 15px;
    font-size: 11px;
  }

  .hero-link {
    gap: 3px;
    font-size: 10px;
  }

  .hero-note {
    margin-top: 20px;
  }

  .hero-art {
    min-height: 215px;
    margin-top: -1px;
  }

  .hero-artwork {
    width: min(78%, 255px);
  }

  .art-caption {
    right: 0;
    bottom: 7px;
    padding: 8px 11px 8px 8px;
  }

  .caption-icon {
    width: 27px;
    height: 27px;
  }

  .art-caption strong {
    font-size: 11px;
  }

  .art-caption small {
    font-size: 9px;
  }

  .promise-row {
    min-height: 0;
    justify-content: space-between;
    gap: 9px;
    padding: 18px 0;
  }

  .promise-item {
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
  }

  .promise-item strong {
    font-size: 10px;
  }

  .promise-item small {
    font-size: 9px;
    line-height: 1.4;
  }

  .promise-divider {
    height: 51px;
  }

  .promise-icon {
    width: 31px;
    height: 31px;
  }

  .promise-icon :deep(.v-icon) {
    font-size: 17px;
  }

  .services-section {
    padding: 40px 0 37px;
  }

  .section-heading {
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .section-heading h2,
  .how-intro h2 {
    font-size: 26px;
  }

  .section-description {
    max-width: 260px;
    font-size: 12px;
  }

  .all-services-link {
    gap: 2px;
    padding-top: 17px;
    font-size: 9px;
    white-space: nowrap;
  }

  .service-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .service-card {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
  }

  .service-visual {
    height: 100%;
    min-height: 133px;
  }

  .service-card-body {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    padding: 13px 13px 12px;
  }

  .service-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .service-title-row h3 {
    max-width: 100%;
    font-size: 15px;
  }

  .service-description {
    min-height: 0;
    margin: 6px 0 8px;
    font-size: 11px;
  }

  .service-card-footer {
    padding-top: 7px;
  }

  .service-price {
    font-size: 12px;
  }

  .service-book {
    width: 28px;
    height: 28px;
  }

  .service-empty {
    padding: 17px;
  }

  .service-empty p {
    font-size: 10px;
    line-height: 1.5;
  }

  .how-section {
    gap: 19px;
    padding: 24px 19px;
  }

  .steps-grid {
    grid-template-columns: 1fr;
    gap: 17px;
  }

  .step-card {
    display: grid;
    grid-template-columns: 39px 1fr;
    column-gap: 12px;
    align-items: center;
  }

  .step-icon {
    grid-row: span 3;
    margin: 0;
  }

  .step-number {
    margin: 0 0 3px;
    font-size: 9px;
  }

  .step-card h3 {
    margin-bottom: 3px;
    font-size: 14px;
  }

  .step-card p {
    font-size: 11px;
  }

  .about-banner {
    grid-template-columns: auto 1fr;
    gap: 13px;
    margin-top: 17px;
    padding: 19px 16px;
  }

  .about-flower {
    width: 45px;
    height: 45px;
  }

  .about-flower :deep(.v-icon) {
    font-size: 27px !important;
  }

  .about-copy h2 {
    font-size: 18px;
  }

  .about-copy > p:last-child {
    font-size: 10px;
  }

  .about-hours {
    grid-column: 1 / -1;
    justify-self: start;
    margin-left: 58px;
    padding: 8px 11px;
  }

  .home-footer {
    min-height: 70px;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px;
    padding: 14px 0 5px;
  }

  .home-footer > span {
    order: 1;
    width: 100%;
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
