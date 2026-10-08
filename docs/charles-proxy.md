# Debugging network traffic with Charles Proxy (Android)

Routes the example app's HTTP(S) traffic through Charles running on your
computer, so you can inspect Amity API calls, uploads and MQTT.

Charles listens on **8888** by default. Every command below honours a
`CHARLES_PORT` env var if you've changed it.

---

## Emulator

### Option A — launch with the proxy already set (recommended)

```sh
yarn android:charles
```

Auto-detects your AVD if you only have one; otherwise pass it explicitly:

```sh
yarn android:charles Pixel_9_Pro
CHARLES_PORT=9999 yarn android:charles Pixel_9_Pro
```

**`10.0.2.2` is the emulator's alias for your computer's loopback interface** —
inside the emulator `localhost` means the emulator itself, so the host has to be
addressed as `10.0.2.2`.

This starts a _new_ emulator instance. If one is already running, the script
warns you — close it first, or use Option B on the running one.

> ⚠️ **The emulator's `-http-proxy` flag alone does not work.** On current
> emulator builds (verified broken on **36.1.9**) the flag is silently ignored:
> the emulator boots with fully working internet that bypasses the proxy
> entirely, and Charles shows nothing. The flag is still passed for older
> builds, but what actually routes traffic is Android's own global proxy
> setting, which the script applies over adb once the device finishes booting.
> Don't be surprised that `adb shell settings get global http_proxy` is what
> reflects the real state.

### Option B — toggle it on a running emulator

```sh
yarn charles:on      # route through Charles
yarn charles:off     # clear it
```

Applies immediately, no restart needed. `charles:on` also works if the launch
script's post-boot step was missed for any reason.

Equivalent raw commands:

```sh
adb shell settings put global http_proxy 10.0.2.2:8888
adb shell settings put global http_proxy :0        # off
```

The GUI route also works — Extended controls (**⋯**) → **Settings** →
**Proxy** → **Manual proxy configuration**, host `10.0.2.2`, port `8888`.

### Verifying it actually works

Don't trust the absence of errors. Generate traffic and confirm Charles is
receiving it:

```sh
adb shell am start -a android.intent.action.VIEW -d "http://neverssl.com"
lsof -nP -iTCP:8888 | grep -c ESTABLISHED     # expect > 0
```

Zero established connections plus working internet in the emulator means the
proxy is **not** in effect.

---

## Physical device

The phone must be on the **same Wi-Fi network** as your computer.

**1. Get your computer's LAN IP:**

```sh
yarn lan-ip
```

Prints the IPv4 address of the active interface, plus the settings to type in.
Add `--quiet` for just the IP (`yarn lan-ip --quiet`).

**2. On the phone:** Settings → Wi-Fi → long-press your network → **Modify
network** → **Advanced** → **Proxy** → **Manual**

| Field      | Value                     |
| ---------- | ------------------------- |
| Proxy host | the IP from `yarn lan-ip` |
| Proxy port | `8888`                    |

**3. Approve the connection.** The first time the phone connects, Charles shows
an **"Allow"** prompt. Accept it — Charles rejects unknown clients by default,
and if you miss the prompt the phone simply gets no network.

---

## Keep the Metro bundle working

With the proxy on, the JS bundle request goes through Charles too, which can
stall or break the dev bundle. Exclude Metro so it bypasses the proxy:

**Charles → Proxy → Proxy Settings → External Proxies → bypass list**, or use a
Charles exclude rule, and add:

```
localhost:8081
10.0.2.2:8081
```

For a physical device also add your computer's LAN IP on the same port, e.g.
`192.168.1.213:8081`.

If the app shows a red "Could not connect to development server" screen while
the proxy is on, this exclusion is almost always what's missing.

---

## HTTPS: seeing decrypted traffic

Charles only shows hostnames — not paths or bodies — until it can decrypt TLS.
Two things are required:

1. **Enable SSL proxying for the hosts** — Charles → Proxy → SSL Proxying
   Settings → add `*.amity.co` (or `*:443` for everything).
2. **Install and trust the Charles root certificate on the device** — Charles →
   Help → SSL Proxying → Install Charles Root Certificate on a Mobile Device.

> **Android 7+ caveat:** apps do **not** trust user-installed CA certificates
> unless the app opts in via a `network_security_config`. If the certificate is
> installed and Charles still can't decrypt, that's why — it needs a debug
> network security config in the example app's manifest.

---

## Turn the proxy off when you're done

⚠️ **This is the step people forget.** A proxy setting outlives Charles: once
Charles is closed, the device still tries to route everything through a port
that nothing is listening on, and the app loses all network access. The symptom
looks exactly like a broken app or a broken build.

- **Emulator:** `yarn charles:off`

  ⚠️ Closing the emulator is **not** enough. Android's global proxy setting is
  written to the device's persistent settings, so it **survives an emulator
  restart** — a later plain `yarn android` will still try to route through a
  port nothing is listening on, and the app will have no network. This is the
  single most likely thing to waste your afternoon.

- **Physical device:** Wi-Fi → Modify network → Advanced → Proxy → **None**.

---

## A warning about debugging uploads through Charles

Charles is **not** a passive packet sniffer. It's a man-in-the-middle proxy:
it terminates the app's TLS connection, decrypts, then re-originates the
request on its own connection to the real server.

For `GET`s that's harmless. For **streamed multipart uploads it is not** —
Charles has to buffer and re-send the request body, and its HTTP/2
request-body handling is the weak spot. It can cause uploads to fail with
`IO: Stream cancelled by CLIENT` **that would have succeeded without it.**

Also check that **Throttling** (Proxy → Throttle Settings) and **Breakpoints**
(Proxy → Breakpoints) are off — either will break a large upload, and both are
easy to leave enabled by accident.

**So when investigating an upload failure, always confirm it still fails with
Charles fully off and the device's proxy cleared** before concluding the bug is
in the app.
