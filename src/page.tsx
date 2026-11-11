'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { products, categories, type Product } from './catalog';
import { burmese } from './burmese';
import { LanguageSwitch, useLocale } from './locale';

type Item = { product: Product; quantity: number; variant: string; date: string; note: string };
type Panel = 'bag' | 'checkout' | 'success' | 'delivery' | 'terms' | 'story';
type Mode = 'All' | 'Buy' | 'Rent' | 'Custom';

const marketOrigin = 'https://etereal-wedding-market.the-studioeternelle.chatgpt.site';
const ordersEndpoint = marketOrigin + '/api/orders';

const modes: Mode[] = ['All', 'Buy', 'Rent', 'Custom'];
const money = (n: number) => '¥' + n.toLocaleString('ja-JP');
const photo = (id: string, width: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=83`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function Dialog({ title, closeLabel, close, children, wide }: {
  title: string; closeLabel: string; close: () => void; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'paper-dialog wide-dialog' : 'paper-dialog'}
      aria-label={title}
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="dialog-sheet">
        <button className="close" aria-label={closeLabel} onClick={close}><X size={22} /></button>
        {children}
      </div>
    </dialog>
  );
}

export default function Page() {
  const locale = useLocale();
  const { language, t } = locale;
  const label = (value: string) => language === 'my' ? burmese[value] ?? value : value;
  const [category, setCategory] = useState('All pieces');
  const [mode, setMode] = useState<Mode>('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Item[]>([]);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [variant, setVariant] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [receipt, setReceipt] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const attempt = useRef<{ id: string; payload: string } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem('etereal-bag') ?? '[]'));
    } catch {}
  }, []);

  function updateCart(next: Item[]) {
    setCart(next);
    try { localStorage.setItem('etereal-bag', JSON.stringify(next)); } catch {}
  }

  function showPanel(next: Panel | null) {
    if (inFlight.current) return;
    setOrderError('');
    setPanel(next);
  }

  function browse(next: Mode = 'All') {
    setMode(next);
    setCategory('All pieces');
    setQuery('');
  }

  function openProduct(product: Product) {
    setSelected(product);
    setVariant(product.variants[0]);
    setDate('');
    setNote('');
  }

  function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    updateCart([...cart, { product: selected, quantity: 1, variant, date, note }]);
    setSelected(null);
    showPanel('bag');
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !cart.length) return;
    const fields = new FormData(event.currentTarget);
    const normalizePhone = (value: string) => value.normalize('NFKC')
      .replace(/[၀-၉]/g, digit => String(digit.charCodeAt(0) - 0x1040));
    const data = {
      name: String(fields.get('name') ?? '').trim(),
      email: String(fields.get('email') ?? '').trim() || undefined,
      language,
      phone: normalizePhone(String(fields.get('phone') ?? '').trim()),
      address: String(fields.get('address') ?? '').trim(),
      cod: fields.get('cod') === 'on',
      items: cart.map(({ product, quantity, variant, date, note }) => ({
        id: product.id, quantity, variant, date, note,
      })),
    };
    const payload = JSON.stringify(data);
    if (attempt.current?.payload !== payload) attempt.current = { id: crypto.randomUUID(), payload };
    const id = attempt.current.id;
    inFlight.current = true;
    setSending(true);
    setOrderError('');
    try {
      const response = await fetch(ordersEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ id, ...data }),
      });
      const result = await response.json() as { id?: string; error?: string; notification?: string };
      if (!response.ok || result.id !== id) {
        setOrderError(response.status === 400 ? result.error ?? 'invalid' : 'unavailable');
        return;
      }
      setReceipt(id);
      setEmailConfirmed(result.notification === 'sent' && Boolean(data.email));
      updateCart([]);
      attempt.current = null;
      setPanel('success');
    } catch {
      setOrderError('unavailable');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  const filterText = query.trim().toLowerCase();
  const shown = products.filter(product => {
    const terms = [product.name, product.category, product.mode, product.id];
    const searchable = [...terms, ...terms.map(term => burmese[term] ?? '')].join(' ').toLowerCase();
    return (category === 'All pieces' || product.category === category)
      && (mode === 'All' || product.mode === mode)
      && searchable.includes(filterText);
  });
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const modeLabel = (value: Mode) => label(value === 'All' ? 'All pieces' : value);
  const panelTitles: Record<Panel, string> = {
    bag: t('Your bag', 'ရွေးထားတဲ့ပစ္စည်းများ'),
    checkout: t('Delivery details', 'ပစ္စည်းပို့ရန် အချက်အလက်'),
    success: t('Order received', 'အော်ဒါ လက်ခံရရှိပါပြီ'),
    delivery: t('Delivery & collection', 'ပစ္စည်းပို့ခြင်းနှင့် လာယူခြင်း'),
    terms: t('Rental & custom policies', 'အငှားနှင့် စိတ်ကြိုက်အော်ဒါ စည်းကမ်းများ'),
    story: t('About Etereal', 'Etereal အကြောင်း'),
  };
  const closeLabel = t('Close', 'ပိတ်ရန်');

  return (
    <>
      <header className="newspaper-header">
        <div className="utility">
          <a href="#collection" className="edition">{t('The Wedding Market', 'မင်္ဂလာပွဲဈေး')}</a>
          <LanguageSwitch {...locale} />
          <div className="tools">
            <button aria-label={panelTitles.bag} onClick={() => showPanel('bag')}><ShoppingBag size={19} /><sup>{cart.length || ''}</sup></button>
          </div>
        </div>
        <div className="masthead">
          <a className="masthead-name" href="./" aria-label="Etereal">Etereal<span>.</span></a>
        </div>
        <nav className="sections" aria-label={t('Market sections', 'ဈေးကဏ္ဍများ')}>
          {modes.map(value => <a key={value} href="#collection" onClick={() => browse(value)}>{modeLabel(value)}</a>)}
          <button onClick={() => showPanel('story')}>{panelTitles.story}</button>
        </nav>
      </header>

      <main>
        <section className="front-page" aria-labelledby="front-title">
          <div className="front-copy">
            <h1 id="front-title">
              <span>{t('For your', 'သင့်မင်္ဂလာပွဲအတွက်')}</span>
              <em>{t('big day.', 'စိတ်ကြိုက်ရွေးပါ။')}</em>
            </h1>
            <p>{t('Find the little things that make your wedding yours. Buy, borrow or have something made just for you.', 'မင်္ဂလာပွဲအတွက် ပစ္စည်းလှလှလေးတွေကို ဒီမှာ ဝယ်လို့၊ ငှားလို့၊ စိတ်ကြိုက်လည်း မှာလို့ရပါတယ်။')}</p>
            <a className="dark-button" href="#collection" onClick={() => browse()}>{t('Browse the market', 'ပစ္စည်းတွေ ကြည့်မယ်')} <ArrowUpRight size={19} /></a>
          </div>
          <figure className="front-photo">
            <img src={photo('photo-1519741497674-611481863552', 1200)} alt={t('A wedding celebration', 'မင်္ဂလာပွဲမြင်ကွင်း')} />
            <figcaption>{t('Little details for your big day', 'မင်္ဂလာပွဲအတွက် အမှတ်တရ ပစ္စည်းလေးတွေ')}</figcaption>
          </figure>
        </section>

        <div className="section-links">
          {([
            ['Buy', 'Find a keepsake', 'အမှတ်တရ သိမ်းထားဖို့'],
            ['Rent', 'Borrow for the day', 'ပွဲနေ့အတွက် ငှားဖို့'],
            ['Custom', 'Make it yours', 'ကိုယ်ပိုင်ပုံစံနဲ့ မှာဖို့'],
          ] as const).map(([value, english, my]) => (
            <a key={value} href="#collection" onClick={() => browse(value)} className={`section-link ${value.toLowerCase()}`}>
              <span><strong>{label(value)}</strong><small>{t(english, my)}</small></span><ArrowUpRight size={20} />
            </a>
          ))}
        </div>

        <section id="collection" className="collection">
          <div className="collection-title">
            <h2>{t('The Market', 'မင်္ဂလာပွဲဈေး')}</h2>
          </div>
          <div className="category-tabs" aria-label={t('Categories', 'ပစ္စည်းအမျိုးအစားများ')}>
            {categories.map(value => (
              <button key={value} aria-pressed={category === value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{label(value)}</button>
            ))}
          </div>
          <div className="filter-row">
            <div className="segments" aria-label={t('Filter by order type', 'မှာယူပုံအလိုက် ရွေးရန်')}>
              {modes.map(value => <button key={value} aria-pressed={mode === value} className={mode === value ? 'chosen' : ''} onClick={() => setMode(value)}>{modeLabel(value)}</button>)}
            </div>
            <label className="search"><Search size={17} /><input aria-label={t('Search the market', 'ပစ္စည်းရှာရန်')} placeholder={t('Search the market…', 'ပစ္စည်းလေးတွေ ရှာမယ်…')} value={query} onChange={event => setQuery(event.target.value)} /></label>
            <span className="count" role="status">{t(`${shown.length} pieces`, `ပစ္စည်း ${shown.length.toLocaleString('my-MM-u-nu-mymr')} မျိုး`)}</span>
          </div>
          <div className="product-grid">
            {shown.map(product => (
              <article key={product.id} className="product-card">
                <div className="product-image">
                  <button className="image-open" onClick={() => openProduct(product)} aria-label={label(product.name)}>
                    <img src={photo(product.image, 720)} alt="" loading="lazy" />
                  </button>
                  <span className={`badge ${product.mode.toLowerCase()}`}>{label(product.mode)}</span>
                </div>
                <div className="product-body">
                  <div className="product-meta">{label(product.category)}</div>
                  <h3><button onClick={() => openProduct(product)}>{label(product.name)}</button></h3>
                  <div className="product-end"><span><strong>{money(product.price)}</strong> <small>{t('from', 'မှစ၍')}</small></span><button className="product-open" aria-label={`${t('View details', 'အသေးစိတ်ကြည့်ရန်')}: ${label(product.name)}`} onClick={() => openProduct(product)}><ArrowUpRight size={19} /></button></div>
                </div>
              </article>
            ))}
          </div>
          {!shown.length && <p className="empty">{t('No matches. Try a different search or filter.', 'ရှာထားတဲ့ ပစ္စည်းမတွေ့ပါ။ တခြားစကားလုံးနဲ့ ရှာကြည့်ပါ။')}</p>}
          <p className="sample-note">{t('Photos and prices are samples. Our team will confirm availability, final price and delivery when they contact you.', 'ပုံနဲ့ ဈေးနှုန်းတွေက နမူနာပါ။ တာဝန်ခံက ဆက်သွယ်တဲ့အခါ ပစ္စည်းရရှိနိုင်မှု၊ နောက်ဆုံးဈေးနှုန်းနဲ့ ပို့ဆောင်မယ့်ရက်ကို အတည်ပြုပေးပါမယ်။')}</p>
        </section>
      </main>

      <footer>
        <a className="footer-logo" href="./">Etereal<span>.</span></a>
        <div>
          <button onClick={() => showPanel('delivery')}>{panelTitles.delivery}</button>
          <button onClick={() => showPanel('terms')}>{panelTitles.terms}</button>
        </div>
      </footer>

      {selected && (
        <Dialog title={label(selected.name)} closeLabel={closeLabel} close={() => setSelected(null)} wide>
          <div className="product-modal">
            <img src={photo(selected.image, 800)} alt="" />
            <form onSubmit={addProduct}>
              <div className="product-meta">{selected.id} · {label(selected.mode)}</div>
              <h2>{label(selected.name)}</h2>
              <p><strong>{money(selected.price)}</strong> · {t('Starting estimate', 'ခန့်မှန်းဈေး')} · {label(selected.lead)}</p>
              <p>{label(selected.desc)}</p>
              <label>{t('Variation', 'ပုံစံရွေးရန်')}<select value={variant} onChange={event => setVariant(event.target.value)}>
                {selected.variants.map(value => <option key={value} value={value}>{label(value)}</option>)}
              </select></label>
              <label>{selected.mode === 'Rent' ? t('Event date (required)', 'ပွဲရက် (ဖြည့်ရန် လိုအပ်သည်)') : t('Event date (optional)', 'ပွဲရက် (မဖြည့်လည်း ရပါတယ်)')}
                <input type="date" required={selected.mode === 'Rent'} min={today()} value={date} onChange={event => setDate(event.target.value)} />
              </label>
              <label>{t('Personalisation / special requests', 'စိတ်ကြိုက်ပြင်ချင်တာ၊ မှာချင်တာများ')}
                <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} placeholder={t('Names, colours, sizes or ideas…', 'နာမည်၊ အရောင်၊ အရွယ်အစား စသဖြင့်…')} />
              </label>
              <button className="dark-button">{t('Add to bag', 'ခြင်းထဲ ထည့်မယ်')} <Plus size={18} /></button>
            </form>
          </div>
        </Dialog>
      )}

      {panel && (
        <Dialog title={panelTitles[panel]} closeLabel={closeLabel} close={() => showPanel(null)}>
          <h2>{panelTitles[panel]}</h2>
          {panel === 'bag' && (
            <>
              {cart.map((item, index) => (
                <div className="cart-item" key={index}>
                  <img src={photo(item.product.image, 160)} alt="" />
                  <div>
                    <h3>{label(item.product.name)}</h3>
                    <p>{label(item.variant)} · {label(item.product.mode)}<br />{item.date}</p>
                    <div className="quantity">
                      <button aria-label={t('Decrease quantity', 'အရေအတွက် လျှော့ရန်')} onClick={() => updateCart(cart.flatMap((row, i) => i !== index ? [row] : row.quantity > 1 ? [{ ...row, quantity: row.quantity - 1 }] : []))}><Minus size={16} /></button>
                      {item.quantity}
                      <button aria-label={t('Increase quantity', 'အရေအတွက် တိုးရန်')} disabled={item.quantity >= 100} onClick={() => updateCart(cart.map((row, i) => i === index ? { ...row, quantity: row.quantity + 1 } : row))}><Plus size={16} /></button>
                      <span>{money(item.product.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length > 0 ? (
                <>
                  <div className="total">{t('Estimated subtotal', 'စုစုပေါင်း ခန့်မှန်းဈေး')} <strong>{money(total)}</strong></div>
                  <p>{t('Pay cash on delivery. Our team will call to confirm delivery fees, any rental deposit, and availability.', 'ပစ္စည်းရောက်မှ ငွေသားနဲ့ ချေပါ။ ပို့ခ၊ အငှားစပေါ်ငွေနဲ့ ပစ္စည်းရရှိနိုင်မှုကို တာဝန်ခံက ဖုန်းဆက်ပြီး အတည်ပြုပေးပါမယ်။')}</p>
                  <button className="dark-button" onClick={() => showPanel('checkout')}>{t('Continue to checkout', 'အော်ဒါ ဆက်တင်မယ်')} <ArrowRight size={18} /></button>
                </>
              ) : <p>{t('Your bag is empty. Find something you like in the market.', 'ခြင်းထဲမှာ ပစ္စည်း မရှိသေးပါ။ ကြိုက်တဲ့ ပစ္စည်းလေးတွေ ရွေးကြည့်ပါ။')}</p>}
            </>
          )}
          {panel === 'checkout' && (
            <form onSubmit={submitOrder}>
              <p>{t('Our team will use these details to confirm your order and arrange delivery by phone.', 'အော်ဒါအတည်ပြုပြီး ပစ္စည်းပို့မယ့် နေ့ရက်၊ အချိန် ညှိဖို့ တာဝန်ခံက ဖုန်းဆက်ပါမယ်။')}</p>
              <label>{t('Full name', 'အမည်အပြည့်အစုံ')}<input name="name" autoComplete="name" required maxLength={100} /></label>
              <label>{t('Email for order updates (optional)', 'အော်ဒါ အခြေအနေ သိရဖို့ အီးမေးလ် (မဖြည့်လည်း ရပါတယ်)')}<input name="email" type="email" autoComplete="email" maxLength={254} /></label>
              <label>{t('Phone number', 'ဖုန်းနံပါတ်')}<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={35} /></label>
              <label>{t('Delivery address', 'ပစ္စည်းပို့ရမယ့် လိပ်စာ')}<textarea name="address" autoComplete="street-address" required minLength={3} maxLength={600} placeholder={t('Include your postal code, building and room number if applicable.', 'စာတိုက်သင်္ကေတ၊ အဆောက်အအုံနာမည်နဲ့ အခန်းနံပါတ်ရှိရင် ထည့်ရေးပေးပါ။')} /></label>
              <div className="total">{t('Estimated subtotal', 'စုစုပေါင်း ခန့်မှန်းဈေး')} <strong>{money(total)}</strong></div>
              <label className="checkbox"><input name="cod" type="checkbox" required />{t('I understand this is cash on delivery (COD). I’ll pay in cash when the order arrives.', 'ဒီအော်ဒါက ပစ္စည်းရောက်မှ ငွေသားနဲ့ ချေရမယ့်စနစ် (COD) ဖြစ်တာကို နားလည်ပါတယ်။')}</label>
              {orderError && <p role="alert">{orderError === 'items'
                ? t('Please check the selected items and rental dates in your bag.', 'ရွေးထားတဲ့ ပစ္စည်းတွေနဲ့ အငှားရက်တွေကို ပြန်စစ်ပေးပါ။')
                : orderError === 'invalid'
                  ? t('Check your name, email, phone number, address and COD acknowledgment.', 'နာမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်၊ လိပ်စာနဲ့ COD အတည်ပြုချက်ကို ပြန်စစ်ပေးပါ။')
                  : t('We couldn’t confirm your order yet. Please try again using the same details.', 'အော်ဒါကို အတည်မပြုနိုင်သေးပါ။ ဖြည့်ထားတဲ့ အချက်အလက်အတိုင်း ထပ်စမ်းပေးပါ။')}</p>}
              <button className="dark-button" disabled={sending}>{sending ? t('Placing order…', 'အော်ဒါ တင်နေပါတယ်…') : t('Place COD order', 'COD နဲ့ အော်ဒါတင်မယ်')} <ArrowUpRight size={18} /></button>
              <button className="checkout-back" type="button" disabled={sending} onClick={() => showPanel('bag')}>{t('Back to bag', 'ရွေးထားတဲ့ပစ္စည်းတွေ ပြန်ကြည့်မယ်')}</button>
            </form>
          )}
          {panel === 'success' && (
            <>
              <p role="status">{t('Order reference', 'အော်ဒါနံပါတ်')} <strong>{receipt.slice(0, 8).toUpperCase()}</strong></p>
              <p>{t('Our team will call you to confirm availability, the final COD amount, and a delivery date and time that works for you.', 'ပစ္စည်းရရှိနိုင်မှု၊ ပစ္စည်းရောက်မှ ချေရမယ့်ငွေနဲ့ ပို့ဆောင်မယ့် နေ့ရက်၊ အချိန်ကို တာဝန်ခံက ဖုန်းဆက်ပြီး အတည်ပြုပေးပါမယ်။')}</p>
              <a className="dark-button" href={marketOrigin + '/track-order#' + receipt}>{t('View your order', 'အော်ဒါ အခြေအနေ ကြည့်မယ်')}</a>
              {!emailConfirmed && <p>{t('Save this private link to check your order again later.', 'နောက်မှ အော်ဒါ ပြန်ကြည့်ဖို့ ဒီသီးသန့်လင့်ခ်ကို သိမ်းထားပါ။')}</p>}
              <button className="outline-button" onClick={() => showPanel(null)}>{t('Back to the market', 'ပစ္စည်းတွေ ပြန်ကြည့်မယ်')}</button>
            </>
          )}
          {panel === 'story' && <p>{t('Etereal brings together wedding pieces to buy, rent and make your own, from the first invitation to the last keepsake.', 'Etereal မှာ မင်္ဂလာဖိတ်စာကနေ အမှတ်တရ ပစ္စည်းလေးတွေအထိ တစ်နေရာတည်းမှာ ဝယ်လို့၊ ငှားလို့၊ စိတ်ကြိုက်မှာလို့ရပါတယ်။')}</p>}
          {panel === 'delivery' && <>
            <p>{t('Request delivery in Japan or studio pickup. We’ll confirm shipping costs and timing for your selection.', 'ဂျပန်နိုင်ငံအတွင်း ပို့ပေးဖို့၊ ဒါမှမဟုတ် စတူဒီယိုမှာ လာယူဖို့ ရွေးလို့ရပါတယ်။ ပို့ခနဲ့ ပို့ပေးမယ့်ရက်ကို ရွေးထားတဲ့ပစ္စည်းပေါ်မူတည်ပြီး အတည်ပြုပေးပါမယ်။')}</p>
            <p>{t('For Myanmar and other countries, ask about shipping availability before ordering. Estimates are in Japanese yen.', 'မြန်မာနိုင်ငံနဲ့ တခြားနိုင်ငံတွေကို ပို့ဖို့ အရင်မေးမြန်းပေးပါ။ ခန့်မှန်းဈေးတွေကို ဂျပန်ယန်းနဲ့ ဖော်ပြထားပါတယ်။')}</p>
          </>}
          {panel === 'terms' && <>
            <h3>{t('Custom pieces', 'စိတ်ကြိုက် ပစ္စည်းများ')}</h3>
            <p>{t('Production starts after you approve the design and quote. We’ll provide cancellation, refund and revision terms before you confirm.', 'ဒီဇိုင်းနဲ့ ဈေးနှုန်း အတည်ပြုပြီးမှ စတင်ပြုလုပ်ပါမယ်။ အော်ဒါ အတည်မပြုခင် ပယ်ဖျက်ခြင်း၊ ငွေပြန်အမ်းခြင်းနဲ့ ပြင်ဆင်ခြင်း စည်းကမ်းချက်တွေကို ရှင်းပြပေးပါမယ်။')}</p>
            <h3>{t('Rentals', 'အငှားပစ္စည်းများ')}</h3>
            <p>{t('We’ll confirm availability, dates, deposit, return arrangements and damage terms before booking.', 'မငှားခင် ပစ္စည်းရရှိနိုင်မှု၊ ငှားမယ့်ရက်၊ စပေါ်ငွေ၊ ပြန်အပ်ပုံနဲ့ ပျက်စီးမှုဆိုင်ရာ စည်းကမ်းချက်တွေကို အတည်ပြုပေးပါမယ်။')}</p>
            <h3>{t('Payment', 'ငွေပေးချေခြင်း')}</h3>
            <p>{t('Pay cash on delivery. Our team will confirm the final amount and arrange the delivery date and time by phone.', 'ပစ္စည်းရောက်မှ ငွေသားနဲ့ ချေပေးပါ။ နောက်ဆုံးကျသင့်ငွေနဲ့ ပစ္စည်းပို့မယ့် နေ့ရက်၊ အချိန်ကို တာဝန်ခံက ဖုန်းဆက်ပြီး အတည်ပြုပေးပါမယ်။')}</p>
          </>}
        </Dialog>
      )}
    </>
  );
}
