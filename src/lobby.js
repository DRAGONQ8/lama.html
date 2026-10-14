// One home renderer, shared by every navigation entry.
function renderHome() {
  homeRenderedDate = dayKey();
  store.extra.favorites = [...new Set(store.extra.favorites)].filter((id) =>
    games.some((g) => g[0] === id),
  );
  setHTML(
    `<section class="lobby-hero edition-hero"><div class="lobby-copy"><span class="release-chip"><span></span>لَمّة 10 · مساحة للعب والتطوّر</span><h1>تحدّيك اليوم.<br><em>خطوتك لباجر.</em></h1><p>${games.length} لعبة عربية، وصالة فردية تبني فيها جلستك على مستواك. درّب مهارة، جرّب تحدّيًا محسوبًا، أو اجمع الربع على نفس الجهاز.</p><div class="actions"><button class="primary" onclick="openSoloHub()">✦ ابدأ جلستك الفردية</button><button class="lobby-party" onclick="openLounge()">👥 نجمع الربع</button></div><div class="lobby-details"><span>◉ بدون إنترنت</span><span>1–12 لاعب</span><button class="linkbtn" onclick="chooseSoloLobby()">كل الألعاب الفردية ↓</button></div></div><div class="lobby-art edition-art" aria-hidden="true"><div class="edition-orbit"></div><div class="edition-card edition-card-back"><span>◈</span><small>فكّر بطريقتك</small></div><div class="edition-card edition-card-front"><div class="edition-card-top"><span>✦</span><small>تحدٍّ على مستواك</small></div><div class="edition-board"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="edition-card-bottom"><b>كل محاولة، خطوة.</b><span>↗</span></div></div><span class="edition-seal">${games.length}<small>لعبة عربية</small></span><span class="edition-spark">✧</span></div></section>${audienceChoicesHTML()}${randomPickButtonsHTML()}<div class="lobby-summary"><button onclick="openProfile()"><span class="summary-icon">✦</span><span><small>مستواك ${level()}</small><b>${250 - (totalPoints() % 250)} نقطة للمستوى التالي</b><span class="mini-progress" style="--progress:${(totalPoints() % 250) / 2.5}%"></span></span><span>←</span></button><button onclick="openGameHistory()"><span class="summary-icon">↺</span><span><small>جولاتك ونتائجك</small><b>${fmt(totalPoints())} <small>نقطة · ${totalRounds()} جولة</small></b></span><span>←</span></button><button onclick="openDaily()"><span class="summary-icon">☀</span><span><small>تحديات اليوم</small><b>${dailyCompleted()} من 3 مكتملة</b></span><span>←</span></button></div>${soloHomeHTML()}${snapshotHTML()}${routeResumeHTML()}${quickLaunchHTML()}<details class="discover-drawer"><summary><span>🗺️ مسارات ومنافسات</span><small>ثلاث محطات لك، أو بطولة للربع</small><b>اكتشف أكثر +</b></summary><div class="discovery-content"><div class="discovery-actions"><button onclick="openLounge()">👥 صالة اللمّة</button><button onclick="openTournament()">🏆 نبدأ بطولة</button><button onclick="openGameHistory()">↺ سجل الجولات</button></div>${routeCardsHTML()}</div></details><div class="sectionhead" id="gamesheading"><div><span class="world-label">${worlds.length - 1} عوالم · ${games.length} لعبة</span><h2>وين نلعب اليوم؟</h2></div><button class="quiet smallbtn" onclick="openGuide()">؟ دليل اللعب</button></div><nav class="worldtabs" aria-label="عوالم الألعاب">${worlds.map((w) => `<button class="worldtab ${world === w[0] ? 'active' : ''}" onclick="setWorld('${w[0]}')" aria-pressed="${world === w[0]}"><span>${w[1]}</span>${w[2]}<small>${w[0] === 'all' ? games.length : games.filter((g) => gameWorld[g[0]] === w[0]).length}</small></button>`).join('')}</nav><div class="catalogbar"><nav class="filter" aria-label="طريقة اللعب">${[
      ['all', 'الكل'],
      ['solo', 'بمفردك'],
      ['duo', 'شخصان'],
      ['group', 'مع الربع'],
      ['new', 'أحدث الألعاب ✦'],
    ]
      .map(
        ([id, label]) =>
          `<button class="${filter === id ? 'active' : ''}" onclick="setFilter('${id}')" aria-pressed="${filter === id}">${label}</button>`,
      )
      .join(
        '',
      )}<button class="${onlyFavorites ? 'active' : ''}" onclick="toggleFavorites()" aria-pressed="${onlyFavorites}">☆ المفضّلة <span id="favcount">${store.extra.favorites.length}</span></button></nav><div class="searchwrap"><label class="sr" for="search">ابحث عن لعبة</label><input id="search" type="search" placeholder="ابحث عن لعبة…  /" value="${esc(searchQuery)}" oninput="searchGames(this.value)" autocomplete="off"></div></div><div class="catalogsummary"><p class="tiny" id="gamecount" aria-live="polite"></p><div class="catalog-sort"><label for="catalogsort">الترتيب</label><select id="catalogsort" onchange="setCatalogSort(this.value)">${[
      ['recommended', 'اختيارات لَمّة'],
      ['name', 'أبجدي'],
      ['recent', 'آخر ألعابك'],
      ['popular', 'الأكثر لعباً عندك'],
    ]
      .map(
        ([v, label]) =>
          `<option value="${v}" ${experience().sort === v ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select><button class="linkbtn" onclick="clearFilters()">إعادة الفلاتر ↺</button></div></div><div class="grid" id="catalog"></div><section class="home-guide"><div><span class="guide-icon">👥</span><h3>جهاز واحد، لمّة كاملة</h3><p>أضف الأسماء، مرّر الجهاز، والعبوا بالتناوب. الكلمات والتصويت تبقى سرية أثناء الأدوار.</p></div><div><span class="guide-icon">⚙</span><h3>إعدادات واضحة</h3><p>خصص المظهر وحجم الخط والتباين والصوت. رتّب اختيارات الألعاب، وخذ نسخة احتياطية من تقدمك في أي وقت.</p></div><div><span class="guide-icon">💾</span><h3>نتائجك معك</h3><p>سجل الجولات والنقاط والألغاز محفوظة هنا. صدّر نسخة احتياطية من الإعدادات لنقل تقدمك.</p></div></section>`,
  );
  renderCatalog();
  $('foot').textContent = `لَمّة 10.0 · ${games.length} لعبة · على جهاز واحد · بدون إنترنت`;
}
