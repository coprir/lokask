// apps/mobile/utils/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      common: {
        loading: 'Loading...',
        error: 'Something went wrong',
        retry: 'Try again',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        done: 'Done',
        back: 'Back',
        next: 'Next',
        skip: 'Skip',
        search: 'Search',
        filter: 'Filter',
        all: 'All',
      },
      auth: {
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        email: 'Email',
        password: 'Password',
        fullName: 'Full Name',
        continueGoogle: 'Continue with Google',
        noAccount: "Don't have an account?",
        haveAccount: 'Already have an account?',
      },
      home: {
        greeting: 'Good morning',
        nearbyServices: 'Nearby Services',
        categories: 'Categories',
        seeAll: 'See all',
        searchPlaceholder: 'Search services, providers...',
      },
      booking: {
        book: 'Book Now',
        selectDate: 'Select Date',
        selectTime: 'Select Time',
        duration: 'Duration',
        notes: 'Notes',
        address: 'Address',
        total: 'Total',
        payNow: 'Pay Now',
        bookingSuccess: 'Booking Confirmed!',
      },
      provider: {
        becomeProvider: 'Become a Provider',
        myServices: 'My Services',
        addService: 'Add Service',
        earnings: 'Earnings',
        payoutSetup: 'Set up payouts',
      },
      dashboard: {
        title: 'Dashboard',
        asProvider: 'As Provider',
        asCustomer: 'As Customer',
        totalEarnings: 'Total Earnings',
        thisMonth: 'This month',
        completed: 'Completed',
      },
      messages: {
        title: 'Messages',
        messagePlaceholder: 'Message...',
        noConversations: 'No messages yet',
      },
      profile: {
        title: 'Profile',
        editProfile: 'Edit Profile',
        language: 'Language',
        notifications: 'Notifications',
        help: 'Help & Support',
        about: 'About LOKASK',
      },
      service: {
        category: 'Category',
        price: 'Price',
        description: 'Description',
        reviews: 'Reviews',
        bookNow: 'Book Now',
        message: 'Message',
      },
    },
  },
  el: {
    translation: {
      common: {
        loading: 'Φόρτωση...',
        error: 'Κάτι πήγε στραβά',
        retry: 'Δοκιμάστε ξανά',
        cancel: 'Ακύρωση',
        confirm: 'Επιβεβαίωση',
        save: 'Αποθήκευση',
        done: 'Έτοιμο',
        back: 'Πίσω',
        next: 'Επόμενο',
        skip: 'Παράλειψη',
        search: 'Αναζήτηση',
        filter: 'Φίλτρο',
        all: 'Όλα',
      },
      auth: {
        signIn: 'Σύνδεση',
        signUp: 'Εγγραφή',
        signOut: 'Αποσύνδεση',
        email: 'Email',
        password: 'Κωδικός',
        fullName: 'Πλήρες Όνομα',
        continueGoogle: 'Συνέχεια με Google',
        noAccount: 'Δεν έχετε λογαριασμό;',
        haveAccount: 'Έχετε ήδη λογαριασμό;',
      },
      home: {
        greeting: 'Καλημέρα',
        nearbyServices: 'Κοντινές Υπηρεσίες',
        categories: 'Κατηγορίες',
        seeAll: 'Όλα',
        searchPlaceholder: 'Αναζήτηση υπηρεσιών...',
      },
      booking: {
        book: 'Κράτηση',
        selectDate: 'Επιλέξτε Ημερομηνία',
        selectTime: 'Επιλέξτε Ώρα',
        duration: 'Διάρκεια',
        notes: 'Σημειώσεις',
        address: 'Διεύθυνση',
        total: 'Σύνολο',
        payNow: 'Πλήρωμα Τώρα',
        bookingSuccess: 'Επιτυχής Κράτηση!',
      },
      dashboard: {
        title: 'Πίνακας Ελέγχου',
        asProvider: 'Ως Πάροχος',
        asCustomer: 'Ως Πελάτης',
        totalEarnings: 'Συνολικά Έσοδα',
        thisMonth: 'Αυτόν τον μήνα',
        completed: 'Ολοκληρωμένα',
      },
      messages: {
        title: 'Μηνύματα',
        messagePlaceholder: 'Μήνυμα...',
        noConversations: 'Δεν υπάρχουν μηνύματα',
      },
      profile: { title: 'Προφίλ', editProfile: 'Επεξεργασία', language: 'Γλώσσα' },
      service: {
        category: 'Κατηγορία',
        price: 'Τιμή',
        description: 'Περιγραφή',
        reviews: 'Κριτικές',
        bookNow: 'Κράτηση',
        message: 'Μήνυμα',
      },
    },
  },
  ru: {
    translation: {
      common: {
        loading: 'Загрузка...', error: 'Что-то пошло не так', retry: 'Повторить',
        cancel: 'Отмена', confirm: 'Подтвердить', save: 'Сохранить', done: 'Готово',
        back: 'Назад', next: 'Далее', skip: 'Пропустить', search: 'Поиск',
      },
      auth: {
        signIn: 'Войти', signUp: 'Зарегистрироваться', signOut: 'Выйти',
        email: 'Email', password: 'Пароль', fullName: 'Полное имя',
      },
      home: { greeting: 'Доброе утро', nearbyServices: 'Услуги рядом', categories: 'Категории' },
      booking: { book: 'Забронировать', total: 'Итого', payNow: 'Оплатить' },
      dashboard: { title: 'Дашборд', totalEarnings: 'Всего заработано' },
      messages: { title: 'Сообщения', messagePlaceholder: 'Сообщение...' },
      profile: { title: 'Профиль', editProfile: 'Редактировать' },
      service: { category: 'Категория', price: 'Цена', bookNow: 'Забронировать' },
    },
  },
  ro: {
    translation: {
      common: {
        loading: 'Se încarcă...', error: 'Ceva a mers greșit', retry: 'Încearcă din nou',
        cancel: 'Anulare', confirm: 'Confirmare', save: 'Salvare', done: 'Gata',
        back: 'Înapoi', next: 'Următor', search: 'Căutare',
      },
      auth: {
        signIn: 'Autentificare', signUp: 'Înregistrare', email: 'Email', password: 'Parolă',
      },
      home: { greeting: 'Bună dimineața', nearbyServices: 'Servicii din apropiere' },
      booking: { book: 'Rezervă', total: 'Total', payNow: 'Plătește Acum' },
      dashboard: { title: 'Tablou de bord', totalEarnings: 'Câștiguri totale' },
      messages: { title: 'Mesaje', messagePlaceholder: 'Mesaj...' },
      profile: { title: 'Profil' },
      service: { bookNow: 'Rezervă' },
    },
  },
  ar: {
    translation: {
      common: {
        loading: 'جارٍ التحميل...', error: 'حدث خطأ', retry: 'حاول مجدداً',
        cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', done: 'تم',
        back: 'رجوع', next: 'التالي', search: 'بحث',
      },
      auth: {
        signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب',
        email: 'البريد الإلكتروني', password: 'كلمة المرور',
      },
      home: { greeting: 'صباح الخير', nearbyServices: 'الخدمات القريبة', categories: 'الفئات' },
      booking: { book: 'احجز الآن', total: 'المجموع', payNow: 'ادفع الآن' },
      dashboard: { title: 'لوحة التحكم', totalEarnings: 'إجمالي الأرباح' },
      messages: { title: 'الرسائل', messagePlaceholder: 'رسالة...' },
      profile: { title: 'الملف الشخصي' },
      service: { bookNow: 'احجز الآن' },
    },
  },
  tl: {
    translation: {
      common: {
        loading: 'Naglo-load...', error: 'May nangyaring mali', retry: 'Subukan muli',
        cancel: 'Kanselahin', confirm: 'Kumpirmahin', save: 'I-save', done: 'Tapos',
        back: 'Bumalik', next: 'Susunod', search: 'Maghanap',
      },
      auth: {
        signIn: 'Mag-sign in', signUp: 'Mag-sign up',
        email: 'Email', password: 'Password',
      },
      home: { greeting: 'Magandang umaga', nearbyServices: 'Mga Serbisyong Malapit' },
      booking: { book: 'Mag-book', total: 'Kabuuan', payNow: 'Bayaran Ngayon' },
      dashboard: { title: 'Dashboard', totalEarnings: 'Kabuuang Kita' },
      messages: { title: 'Mga Mensahe', messagePlaceholder: 'Mensahe...' },
      profile: { title: 'Profile' },
      service: { bookNow: 'Mag-book Na' },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', rtl: false },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
  { code: 'ro', name: 'Română', flag: '🇷🇴', rtl: false },
  { code: 'ar', name: 'العربية', flag: '🇦🇪', rtl: true },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭', rtl: false },
];
