import unittest

from fetcher.enrich import dedupe_key, detect_language, detect_pii, enrich, match_keywords
from fetcher.models import Record
from fetcher.textutil import html_to_text, iso_date


class LanguageTests(unittest.TestCase):
    def test_english(self):
        self.assertEqual(detect_language("My SIP amount was deducted twice this month"), "English")

    def test_hinglish(self):
        self.assertEqual(detect_language("SIP ka paisa kat gaya but units nahi mile"), "Hinglish")
        self.assertEqual(detect_language("5 months ho gaye portfolio abhi bhi -2%"), "Hinglish")

    def test_hindi(self):
        self.assertEqual(detect_language("मेरा एसआईपी बंद हो गया है"), "Hindi")

    def test_english_with_short_particles_stays_english(self):
        self.assertEqual(detect_language("I want to know the NAV of the fund to invest"), "English")


class PiiTests(unittest.TestCase):
    def test_types(self):
        self.assertIn("phone", detect_pii("call me on +91 98765 43210"))
        self.assertIn("email", detect_pii("mail a.b@gmail.com"))
        self.assertIn("upi", detect_pii("my upi is rahul@okaxis"))
        self.assertIn("bank_account", detect_pii("account 123456789012"))
        self.assertIn("pan", detect_pii("PAN ABCDE1234F"))

    def test_no_false_positive_on_amounts(self):
        self.assertEqual(detect_pii("₹5000 SIP, down -2% after 5 months, T-3 cutoff"), [])


class KeywordTests(unittest.TestCase):
    def test_matches(self):
        self.assertEqual(match_keywords("My SIP mandate failed, NACH bounce"), ["sip", "mandate", "nach"])

    def test_word_boundary(self):
        self.assertEqual(match_keywords("gossip and navigation"), [])


class TextTests(unittest.TestCase):
    def test_html_strips_quotes(self):
        html = '<aside class="quote"><blockquote><p>old text</p></blockquote></aside><p>My first SIP&amp;more</p>'
        self.assertEqual(html_to_text(html), "My first SIP&more")

    def test_iso_date(self):
        self.assertEqual(iso_date("2024-03-05T10:00:00Z"), "2024-03-05")
        self.assertEqual(iso_date(0), "1970-01-01")
        self.assertEqual(iso_date(None), "unknown")


class EnrichTests(unittest.TestCase):
    def test_enrich_and_dedupe(self):
        a = enrich(Record("Reddit", "  My first SIP!  ", "u1", "2024-01-01", "post"))
        b = enrich(Record("Reddit", "my first sip", "u2", "2024-01-02", "post"))
        self.assertTrue(a.id.startswith("RD-"))
        self.assertEqual(a.rawText, "My first SIP!")
        self.assertEqual(dedupe_key(a), dedupe_key(b))
        self.assertNotEqual(a.id, b.id)


if __name__ == "__main__":
    unittest.main()
