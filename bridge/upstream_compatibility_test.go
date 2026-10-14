package main

import (
	"encoding/base64"
	"net/url"
	"strings"
	"testing"
)

func TestPreprocessPreservesURIComponentEscapes(t *testing.T) {
	for _, input := range []string{
		"trojan://p+ass%23%26%25@proxy.example.test:443#Name%2BOne",
		"ss://aes-128-gcm:p+ass%23@proxy.example.test:8388#Name",
		"vless://00000000-0000-0000-0000-000000000001@proxy.example.test:443?path=%2Fa%3Fx%3D1%26y%3D2#Name",
		"tuic://00000000-0000-0000-0000-000000000001:p+ass%23@proxy.example.test:443#Name",
		"mierus://user:p+ass%23@proxy.example.test:443#Name",
		"trojan://invalid%zz@proxy.example.test:443#Name",
	} {
		t.Run(input, func(t *testing.T) {
			if got := preprocessSubscription(input); got != input {
				t.Fatalf("component bytes changed: want %q, got %q", input, got)
			}
		})
	}
}

func TestPreprocessUnwrapsFullyEncodedURIOnce(t *testing.T) {
	input := "trojan://p+ass%23@proxy.example.test:443#Name%2BOne"
	if got := preprocessSubscription(url.QueryEscape(input)); got != input {
		t.Fatalf("full URI decoding changed components: want %q, got %q", input, got)
	}
}

func TestPreprocessNormalizesOnlyLegacyUserinfoSeparator(t *testing.T) {
	for _, scheme := range []string{"ss", "tuic"} {
		for _, colon := range []string{"%3A", "%3a"} {
			input := scheme + "://user" + colon + "p+ass%23%26@proxy.example.test:443#Name"
			want := scheme + "://user:p+ass%23%26@proxy.example.test:443#Name"
			if got := preprocessSubscription(input); got != want {
				t.Fatalf("legacy separator decoding changed components: want %q, got %q", want, got)
			}
		}
	}
	input := "ss://aes-128-gcm:p%3Ass@proxy.example.test:8388#Name"
	if got := preprocessSubscription(input); got != input {
		t.Fatalf("password colon was decoded early: %q", got)
	}
}

func TestParseEscapedSubscriptionEnvelopes(t *testing.T) {
	input := "trojan://p+ass%23%26%25@proxy.example.test:443#Escaped"
	for label, subscription := range map[string]string{
		"plain":         input,
		"base64":        base64.StdEncoding.EncodeToString([]byte(input)),
		"url-safe":      base64.RawURLEncoding.EncodeToString([]byte(input)),
		"encoded-uri":   url.QueryEscape(input),
		"encoded-inner": base64.StdEncoding.EncodeToString([]byte(url.QueryEscape(input))),
	} {
		t.Run(label, func(t *testing.T) {
			proxies, err := parseSubscriptionWithMihomo(subscription)
			if err != nil {
				t.Fatal(err)
			}
			if len(proxies) != 1 || proxies[0]["password"] != "p+ass#&%" || proxies[0]["name"] != "Escaped" {
				t.Fatalf("escaped subscription changed: %#v", proxies)
			}
		})
	}
}

func TestParseNativeYAMLDoesNotPreprocessScalars(t *testing.T) {
	input := "proxies:\n  - name: 'Name+%23'\n    type: trojan\n" +
		"    server: proxy.example.test\n    port: 443\n    password: 'p+ass%23%26'\n"
	proxies, err := parseSubscriptionWithMihomo(input)
	if err != nil {
		t.Fatal(err)
	}
	if len(proxies) != 1 || proxies[0]["name"] != "Name+%23" || proxies[0]["password"] != "p+ass%23%26" {
		t.Fatalf("native scalar bytes changed: %#v", proxies)
	}
	invalid := input + "  - name: Bad\n    type: trojan\n    server: bad.example.test\n    port: 0\n    password: fixture\n"
	if _, err := parseSubscriptionWithMihomo(invalid); err == nil {
		t.Fatal("native YAML silently skipped an invalid mapping")
	}
}

func TestParseMixedURIsSkipsInvalidMappings(t *testing.T) {
	valid := "trojan://fixture@proxy.example.test:443#Valid"
	invalid := "trojan://fixture@bad.example.test:0#Bad"
	for label, input := range map[string]string{
		"plain":  invalid + "\n" + valid,
		"base64": base64.StdEncoding.EncodeToString([]byte(invalid + "\n" + valid)),
	} {
		t.Run(label, func(t *testing.T) {
			proxies, err := parseSubscriptionWithMihomo(input)
			if err != nil {
				t.Fatal(err)
			}
			if len(proxies) != 1 || proxies[0]["name"] != "Valid" {
				t.Fatalf("valid node lost in mixed subscription: %#v", proxies)
			}
		})
	}
	if _, err := parseSubscriptionWithMihomo(strings.Join([]string{invalid, invalid}, "\n")); err == nil {
		t.Fatal("all-invalid URI subscription was accepted")
	}
}
