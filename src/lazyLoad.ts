export class LazyWidgetLoader {
  private observers = new Map<HTMLElement, IntersectionObserver>();

  schedule(el: HTMLElement, outer: HTMLElement, script: HTMLScriptElement, placeholder: HTMLElement, lazyLoad: boolean): void {
    const load = () => {
      this.disconnect(el);
      if (!el.isConnected || script.isConnected) return;

      placeholder.setText("Loading TradingView widget…");
      window.setTimeout(() => placeholder.detach(), 4000);
      outer.appendChild(script);
    };

    if (!lazyLoad || !("IntersectionObserver" in window)) {
      load();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) load();
    }, {
      root: null,
      rootMargin: "400px 0px",
      threshold: 0.01,
    });

    this.observers.set(el, observer);
    observer.observe(el);
  }

  disconnect(el: HTMLElement): void {
    const observer = this.observers.get(el);
    if (!observer) return;
    observer.disconnect();
    this.observers.delete(el);
  }

  disconnectAll(): void {
    Array.from(this.observers.values()).forEach((observer) => observer.disconnect());
    this.observers.clear();
  }
}
