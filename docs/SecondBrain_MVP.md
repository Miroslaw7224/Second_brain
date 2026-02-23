**🧠 Second Brain dla Freelancerów**

*Plan MVP · Solo Founder · Etap: HOW · Timeline: 5--7 dni*

**Stack: Carrd + Google AI Studio + Airtable + Glide**

**1. Pomysł w pigułce**

Narzędzie AI, które pozwala freelancerom rozmawiać z własną wiedzą ---
notatkami, dokumentami i historią projektów klientów.

**Dla kogo**

-   Aktywni freelancerzy obsługujący wielu klientów jednocześnie

-   Osoby, które gubią kontekst między projektami, mailami i ustaleniami

**Ból użytkownika**

-   \"Gdzie ja to zapisałem\... chyba w jakimś mailu z marca\...\"

-   Tracą czas na szukanie ustaleń, wycen i historii rozmów

-   Brak jednego miejsca, gdzie siedzi cała wiedza o klientach

**Przed → Po**

  ----------------------------------- -----------------------------------
  **PRZED**                           **PO**

  Freelancer przekopuje stare maile i Pyta \"Co ustaliliśmy z klientem X
  notatki przez 30 minut szukając     w marcu?\" i dostaje konkretną
  ustaleń z klientem.                 odpowiedź w 3 sekundy.
  ----------------------------------- -----------------------------------

**Sukces po MVP**

-   5 freelancerów używa regularnie przez 2 tygodnie

-   Co najmniej 2 osoby mówią: \"zapłaciłbym za to \$15--20/msc\"

-   Przynajmniej 1 płatny użytkownik przed końcem miesiąca

**2. Mapa Przepływu MVP --- Diagram Mermaid**

*Poniżej logiczny flow aplikacji. Skopiuj kod do mermaid.live lub
Notion, żeby zobaczyć wizualizację:*

> flowchart TD
>
> A\[Landing Page - Carrd\] \--\> B\[Formularz waitlisty - Tally\]
>
> B \--\> C\[Baza kontaktów - Airtable\]
>
> C \--\> D\[Zaproszenie do demo - email\]
>
> D \--\> E\[Aplikacja Glide - upload notatek\]
>
> E \--\> F\[Google AI Studio - analiza i Q&A\]
>
> F \--\> G\[Odpowiedź AI z cytatem źródła\]
>
> G \--\> H\[Feedback - czy to rozwiązuje Twój problem?\]

**3. Stack Technologiczny --- No-Code**

Priorytet: prostota i szybkość. Żadnej linii kodu --- walidujemy pomysł,
nie budujemy produktu.

  ---------------- ---------------- -------------------------------------
  **Potrzeba**     **Narzędzie**    **Dlaczego**

  Landing Page     Carrd.co         Gotowy w 1 godzinę, bez konfiguracji

  Formularz        Tally.so         Darmowy, piękny, łączy się z Airtable
  waitlisty                         

  Baza danych /    Airtable         Elastyczna, zero kodu, wizualna
  CRM                               

  Aplikacja dla    Glide            Buduje appkę z Google Sheets w 2h
  użytkowników                      

  Logika AI / Q&A  Google AI Studio Darmowe do testów, szybkie, API-ready

  Automatyzacje    Make             Łączy wszystkie narzędzia bez kodu
                   (Integromat)     

  Płatności (po    Stripe Payment   Link do płatności bez integracji
  walidacji)       Link             
  ---------------- ---------------- -------------------------------------

**4. Zakres MVP --- tylko to, co konieczne**

**Funkcje na MVP**

-   Landing page z opisem problemu i formularzem zapisu na waitlistę

-   Prosta appka Glide: wklejanie notatek i dokumentów tekstowych

-   Chat z własną bazą wiedzy przez Google AI Studio (prompt + kontekst)

-   Ręczne zapraszanie pierwszych 5 użytkowników

**Wyrzucamy na później**

-   Automatyczne indeksowanie i embeddingi (RAG)

-   Upload PDF i plików --- na start tylko tekst wklejany ręcznie

-   Integracje z mailem, Notion, Google Drive

-   Aplikacja mobilna, wersjonowanie, dashboard analityczny

-   Własny backend --- dodajemy gdy pojawi się popyt

**5. Timeline --- 5--7 dni**

  ----------- ---------------------- -------------------- ------------------
  **Dzień**   **Zadanie**            **Cel**              **Narzędzie**

  Dzień 1     Landing page +         Strona online,       Carrd + Tally
              formularz waitlisty    zbieramy maile       

  Dzień 2     Post na Reddit +       20 maili na liście   Ręcznie
              LinkedIn + cold        przed budowaniem     
              outreach                                    

  Dzień 3     Baza w Airtable +      Działający prototyp  Airtable + Glide
              prosta appka Glide     appki                

  Dzień 4     Integracja Google AI   Można zadać pytanie  Google AI Studio +
              Studio z Glide         i dostać odpowiedź   Make

  Dzień 5     Testy na własnych      Produkt działa bez   Glide
              danych, poprawki UX    wiedzy technicznej   

  Dzień 6     5 osób z waitlisty     Pierwsze dane        Email ręczny
              dostaje dostęp         walidacyjne i        
                                     feedback             

  Dzień 7     Rozmowy z              Walidacja lub pivot  Zoom/Meet
              użytkownikami, decyzja                      
              o kolejnym kroku                            
  ----------- ---------------------- -------------------- ------------------

**6. Model Cenowy**

  ----------- ------------- -------------------------- -------------------
  **Plan**    **Cena**      **Zawartość**              **Cel**

  Free Trial  0 zł / 7 dni  Pełny dostęp, bez karty    Usuwa barierę
                            kredytowej                 wejścia

  Solo        \$19 / msc    Do 50 dokumentów,          Główny plan na MVP
                            nielimitowany chat         

  Pro         \$39 / msc    Nielimitowane dokumenty +  Gdy pojawi się
  (później)                 integracje                 popyt
  ----------- ------------- -------------------------- -------------------

*Zasada: jeden prosty plan na start. Nie komplikuj cen zanim nie wiesz,
czego chcą klienci.*

**7. Strategia Startu**

**Zanim zbudujesz cokolwiek**

-   Postaw stronę na Carrd.co (1 godzina) z opisem problemu i
    formularzem waitlisty

-   Zbierz minimum 20 maili zanim zaczniesz budować

-   Napisz post na Reddit (r/freelance) opisując problem --- NIE produkt

**Kanały promocji**

-   Reddit: r/freelance, r/productivity, r/SaaS --- opisuj problem,
    pytaj o opinię

-   IndieHackers --- pokaż co budujesz, społeczność lubi przejrzystość

-   LinkedIn --- post: \"Buduję to narzędzie, czy masz ten problem?\"

-   Cold outreach --- napisz do 10 freelancerów na LinkedIn z prośbą o
    15 minut rozmowy

**Pytania do pierwszych użytkowników**

-   Czy to rozwiązuje Twój problem?

-   Zapłaciłbyś za to? Jeśli nie --- dlaczego?

-   Co jest dla Ciebie najważniejszą funkcją?

-   Czego Ci tutaj brakuje?

**8. Ryzyka i jak je ograniczyć**

  ------------------------------ ----------------------------------------
  **Ryzyko**                     **Jak ograniczyć**

  Koszty Google AI Studio        Ustaw limit \$10/msc w Google Cloud od
  wymykają się                   dnia 1

  Glide nie wystarczy do         Na MVP wystarczy prompt + wklejony tekst
  złożonego RAG                  --- RAG dodaj później

  Brak użytkowników po launchu   Pokaż działające demo już w dniu 4, nie
                                 czekaj na gotowy produkt

  Złe odpowiedzi AI              Testuj prompt na własnych dokumentach od
                                 dnia 3

  Nikt nie płaci \$19/msc        Zwaliduj cenę zanim zbudujesz Stripe ---
                                 zapytaj 10 osób wprost
  ------------------------------ ----------------------------------------

**9. Kolejne Kroki**

  --------------- ------------------------------------- ---------------------
  **Priorytet**   **Akcja**                             **Kiedy**

  🔴 Dziś         Postaw Carrd z waitlistą i zacznij    Przed pisaniem kodu
                  zbierać maile                         

  🟡 Ten tydzień  Zbierz 20 maili i przeprowadź 3       Przed budowaniem
                  rozmowy z freelancerami               

  🟢 Dzień 3--4   Zbuduj prototyp w Glide + Google AI   Po potwierdzeniu bólu
                  Studio                                

  🟢 Dzień 5--6   Daj dostęp 5 osobom z waitlisty za    Demo gotowe
                  feedback                              

  📊 Po launchu   Zbierz feedback i zdecyduj: budować   Dzień 7+
                  dalej czy pivot?                      
  --------------- ------------------------------------- ---------------------

***Pamiętaj: MVP ma odpowiedzieć na jedno pytanie --- czy ktoś za to
zapłaci?***