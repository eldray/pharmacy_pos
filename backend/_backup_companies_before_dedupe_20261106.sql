--
-- PostgreSQL database dump
--

\restrict s2r9Hosn2h3kBLrgqnSeVfMbZsGa4NIuKaTINkmuR2TegxNKYYdegrfSrUtkfLj

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.companies (id, name, "addressStreet", "addressCity", "addressCountry", "contactPhone", "contactEmail", "taxRate", "receiptFooter", "createdAt", "updatedAt", logo, "addressState", "addressZipCode", "contactWebsite", "taxId", "receiptHeader", "includeTaxId") VALUES (1, 'Pharmacy POS', '', '', 'Ghana', '', '', 0.00, 'We hope to see you again soon!', '2026-11-05 17:10:58.677+00', '2026-11-06 12:44:18.741+00', '', '', '', '', '', 'Thank you for your business!', false);
INSERT INTO public.companies (id, name, "addressStreet", "addressCity", "addressCountry", "contactPhone", "contactEmail", "taxRate", "receiptFooter", "createdAt", "updatedAt", logo, "addressState", "addressZipCode", "contactWebsite", "taxId", "receiptHeader", "includeTaxId") VALUES (2, 'Pharmacy POS System', '123 Pharmacy Street', 'Accra', 'Ghana', '+233555123456', 'info@pharmacy.com', 0.00, 'Thank you for your purchase!', '2026-11-05 23:55:08.811+00', '2026-11-06 13:01:08.184+00', NULL, NULL, NULL, NULL, NULL, 'Thank you for your business!', false);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--

\unrestrict s2r9Hosn2h3kBLrgqnSeVfMbZsGa4NIuKaTINkmuR2TegxNKYYdegrfSrUtkfLj

