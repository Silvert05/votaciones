import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Directive,
    ElementRef,
    inject,
    OnDestroy,
    Renderer2,
} from '@angular/core';

/**
 * 'position: sticky' breaks when an ancestor (here, <html>) becomes
 * 'position: fixed', which is exactly what Angular CDK's block scroll
 * strategy does while a 'over' mode fuse-vertical-navigation is open
 * (it adds the 'cdk-global-scrollblock' class to <html>).
 *
 * fuse-vertical-navigation already compensates for its own element
 * (see vertical.component.ts). This directive applies the same fix
 * to any other sticky element on the page, such as a layout's header,
 * which otherwise renders shifted after the drawer closes.
 */
@Directive({
    selector: '[fuseStickyScrollBlockFix]',
    standalone: true,
})
export class FuseStickyScrollBlockFixDirective
    implements AfterViewInit, OnDestroy
{
    private _document = inject(DOCUMENT);
    private _elementRef = inject(ElementRef);
    private _renderer2 = inject(Renderer2);

    private _mutationObserver: MutationObserver;

    ngAfterViewInit(): void {
        this._mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const mutationTarget = mutation.target as HTMLElement;
                if (mutation.attributeName !== 'class') {
                    return;
                }
                if (mutationTarget.classList.contains('cdk-global-scrollblock')) {
                    const top = parseInt(mutationTarget.style.top, 10);
                    this._renderer2.setStyle(
                        this._elementRef.nativeElement,
                        'margin-top',
                        `${Math.abs(top)}px`
                    );
                } else {
                    this._renderer2.setStyle(
                        this._elementRef.nativeElement,
                        'margin-top',
                        null
                    );
                }
            });
        });
        this._mutationObserver.observe(this._document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    ngOnDestroy(): void {
        this._mutationObserver?.disconnect();
    }
}
