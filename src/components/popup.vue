<template>
    <div v-cloak v-bind:class="{ 'theme-normal': !useHighContrast, 'theme-accessibility': useHighContrast }">
    <div class="header">
        <span>{{ i18n.extName }}</span>
        <div v-show="!isPopup()">
            <div class="icon" id="i-menu" v-bind:title="i18n.settings" v-on:click="showMenu()" v-show="!isEditing"><svg viewBox="0 0 512 512"><title id="cog-title">cog</title><path d="M444.788 291.1l42.616 24.599c4.867 2.809 7.126 8.618 5.459 13.985-11.07 35.642-29.97 67.842-54.689 94.586a12.016 12.016 0 0 1-14.832 2.254l-42.584-24.595a191.577 191.577 0 0 1-60.759 35.13v49.182a12.01 12.01 0 0 1-9.377 11.718c-34.956 7.85-72.499 8.256-109.219.007-5.49-1.233-9.403-6.096-9.403-11.723v-49.184a191.555 191.555 0 0 1-60.759-35.13l-42.584 24.595a12.016 12.016 0 0 1-14.832-2.254c-24.718-26.744-43.619-58.944-54.689-94.586-1.667-5.366.592-11.175 5.459-13.985L67.212 291.1a193.48 193.48 0 0 1 0-70.199l-42.616-24.599c-4.867-2.809-7.126-8.618-5.459-13.985 11.07-35.642 29.97-67.842 54.689-94.586a12.016 12.016 0 0 1 14.832-2.254l42.584 24.595a191.577 191.577 0 0 1 60.759-35.13V25.759a12.01 12.01 0 0 1 9.377-11.718c34.956-7.85 72.499-8.256 109.219-.007 5.49 1.233 9.403 6.096 9.403 11.723v49.184a191.555 191.555 0 0 1 60.759 35.13l42.584-24.595a12.016 12.016 0 0 1 14.832 2.254c24.718 26.744 43.619 58.944 54.689 94.586 1.667 5.366-.592 11.175-5.459 13.985L444.788 220.9a193.485 193.485 0 0 1 0 70.2zM336 256c0-44.112-35.888-80-80-80s-80 35.888-80 80 35.888 80 80 80 80-35.888 80-80z"></path></svg></div>
            <div class="icon" id="i-lock" v-bind:title="i18n.lock" v-on:click="lock()" v-show="!isEditing && encryption.getEncryptionStatus()"><svg viewBox="0 0 448 512"><title id="lock-title">lock</title><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"></path></svg></div>
            <div class="icon" id="i-sync" v-bind:style="{left: encryption.getEncryptionStatus() ? '70px' : '45px'}" v-show="(dropboxToken !== '' || driveToken !== '') && !isEditing"><svg viewBox="0 0 512 512"><title id="sync-alt-title">Alternate Sync</title><path d="M370.72 133.28C339.458 104.008 298.888 87.962 255.848 88c-77.458.068-144.328 53.178-162.791 126.85-1.344 5.363-6.122 9.15-11.651 9.15H24.103c-7.498 0-13.194-6.807-11.807-14.176C33.933 94.924 134.813 8 256 8c66.448 0 126.791 26.136 171.315 68.685L463.03 40.97C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.749zM32 296h134.059c21.382 0 32.09 25.851 16.971 40.971l-41.75 41.75c31.262 29.273 71.835 45.319 114.876 45.28 77.418-.07 144.315-53.144 162.787-126.849 1.344-5.363 6.122-9.15 11.651-9.15h57.304c7.498 0 13.194 6.807 11.807 14.176C478.067 417.076 377.187 504 256 504c-66.448 0-126.791-26.136-171.315-68.685L48.97 471.03C33.851 486.149 8 475.441 8 454.059V320c0-13.255 10.745-24 24-24z"></path></svg></div>
            <div class="icon" id="i-qr" v-bind:title="i18n.add_qr" v-show="!isEditing" v-on:click="beginCapture()"><svg viewBox="0 0 1000 1000"><g><path d="M10,431h980v138.1H10V431L10,431z"/><path d="M162.1,323.8H24V12.9h362.6V151H162.1V323.8z"/><path d="M976,323.8H837.9V151H613.4V12.9H976V323.8z"/><path d="M386.6,987.1H24V676.2h138.1V849h224.5V987.1z"/><path d="M976,987.1H613.4V849h224.5V676.2H976V987.1z"/></g></svg></div>
            <div class="icon" id="i-edit" v-bind:title="i18n.edit" v-if="!isEditing" v-on:click="editEntry()"><svg viewBox="0 0 512 512"><title id="pencil-alt-title">Alternate Pencil</title><path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-12.3 4.7-17 0l-111-111c-4.7-4.7-4.7-12.3 0-17l46.1-46.1c18.7-18.7 49.1-18.7 67.9 0l60.1 60.1c18.8 18.7 18.8 49.1 0 67.9zM284.2 99.8L21.6 362.4.4 483.9c-2.9 16.4 11.4 30.6 27.8 27.8l121.5-21.3 262.6-262.6c4.7-4.7 4.7-12.3 0-17l-111-111c-4.8-4.7-12.4-4.7-17.1 0zM124.1 339.9c-5.5-5.5-5.5-14.3 0-19.8l154-154c5.5-5.5 14.3-5.5 19.8 0s5.5 14.3 0 19.8l-154 154c-5.5 5.5-14.3 5.5-19.8 0zM88 424h48v36.3l-64.5 11.3-31.1-31.1L51.7 376H88v48z"></path></svg></div>
            <div class="icon" id="i-edit" v-bind:title="i18n.edit" v-else v-on:click="editEntry()"><svg viewBox="0 0 512 512"><title id="check-title">Check</title><path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path></svg></div>
        </div>
    </div>
    <div id="codes" v-bind:class="{'timeout': currentClass.timeout && !isEditing, 'edit': isEditing, 'filter': shouldFilter && filter, 'search': showSearch}">
        <div class="under-header" id="filter" v-on:click="clearFilter()">{{ i18n.show_all_entries }}</div>
        <div class="under-header" id="search">
          <input id="searchInput" v-on:keydown="searchUpdate()" v-model="searchText" v-bind:placeholder="i18n.search" type="text">
          <div id="searchHint" v-if="searchText === ''">
            <div></div>
            <div id="searchHintBorder">/</div>
            <div></div>
          </div>
        </div>
        <div v-dragula="entries" drake="entryDrake">
            <!-- ENTRIES -->
            <div class="entry" v-for="entry in entries" :key="entry.hash" v-bind:filtered="!isMatchedEntry(entry)" v-bind:notSearched="!isSearchedEntry(entry)">
                <div class="deleteAction" v-on:click="removeEntry(entry)"><svg viewBox="0 0 512 512"><title id="minus-circle-title">Minus Circle</title><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zM124 296c-6.6 0-12-5.4-12-12v-56c0-6.6 5.4-12 12-12h264c6.6 0 12 5.4 12 12v56c0 6.6-5.4 12-12 12H124z"></path></svg></div>
                <div class="sector" v-if="entry.type !== OTPType.hotp && entry.type !== OTPType.hhex" v-show="sectorStart">
                    <svg viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="4" v-bind:style="{animationDuration: entry.period + 's', animationDelay: (sectorOffset % entry.period) + 's'}"/>
                    </svg>
                </div>
                <div v-bind:class="{'counter': true, 'disabled': currentClass.hotpDiabled}" v-if="entry.type === OTPType.hotp || entry.type === OTPType.hhex" v-on:click="nextCode(entry)"><svg viewBox="0 0 512 512"><title id="redo-alt-title">Alternate Redo</title><path d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path></svg></div>
                <div class="issuer">{{ entry.issuer.split('::')[0] }}</div>
                <div class="issuerEdit">
                    <input v-bind:placeholder="i18n.issuer" type="text" v-model="entry.issuer" v-on:change="entry.update(encryption)">
                </div>
                <div v-bind:class="{'code': true, 'hotp': entry.type === OTPType.hotp || entry.type === OTPType.hhex, 'no-copy': noCopy(entry.code), 'timeout': entry.period - second % entry.period < 5 }" v-on:click="copyCode(entry)" v-html="isEditing ? showBulls(entry.code) : entry.code"></div>
                <div class="issuer">{{ entry.account }}</div>
                <div class="issuerEdit">
                    <input v-bind:placeholder="i18n.accountName" type="text" v-model="entry.account" v-on:change="entry.update(encryption)">
                </div>
                <div class="showqr" v-if="shouldShowQrIcon(entry)" v-on:click="showQr(entry)"><svg viewBox="0 0 448 512"><title id="qrcode-title">qrcode</title><path d="M0 224h192V32H0v192zM64 96h64v64H64V96zm192-64v192h192V32H256zm128 128h-64V96h64v64zM0 480h192V288H0v192zm64-128h64v64H64v-64zm352-64h32v128h-96v-32h-32v96h-64V288h96v32h64v-32zm0 160h32v32h-32v-32zm-64 0h32v32h-32v-32z"></path></svg></div>
                <div class="movehandle"><svg viewBox="0 0 448 512"><title id="bars-title">Bars</title><path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg></div>
            </div>
        </div>
        <div class="icon" id="add" v-on:click="showInfo('account')"><svg viewBox="0 0 448 512"><title id="plus-title">plus</title><path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg></div>
    </div>

    <!-- MENU -->
    <div id="menu" v-bind:class="{'slidein': currentClass.slidein, 'slideout': currentClass.slideout}">
        <div class="header">
            <span id="menuName">{{ i18n.settings }}</span>
            <div class="icon" id="i-close" v-on:click="closeMenu()"><svg viewBox="0 0 448 512"><title id="arrow-left-title">arrow-left</title><path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"></path></svg></div>
        </div>
        <div id="menuBody">
            <div class="menuList">
                <p v-bind:title="i18n.about" v-on:click="showInfo('about')"><span><svg viewBox="0 0 192 512"><title id="info-title">Info</title><path d="M20 424.229h20V279.771H20c-11.046 0-20-8.954-20-20V212c0-11.046 8.954-20 20-20h112c11.046 0 20 8.954 20 20v212.229h20c11.046 0 20 8.954 20 20V492c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20v-47.771c0-11.046 8.954-20 20-20zM96 0C56.235 0 24 32.235 24 72s32.235 72 72 72 72-32.235 72-72S135.764 0 96 0z"></path></svg></span>{{ i18n.about }}</p>
            </div>
            <div class="menuList">
                <p v-bind:title="i18n.export_import" v-on:click="showInfo('export')"><span><svg viewBox="0 0 512 512"><title id="exchange-alt-title">Alternate Exchange</title><path d="M0 168v-16c0-13.255 10.745-24 24-24h360V80c0-21.367 25.899-32.042 40.971-16.971l80 80c9.372 9.373 9.372 24.569 0 33.941l-80 80C409.956 271.982 384 261.456 384 240v-48H24c-13.255 0-24-10.745-24-24zm488 152H128v-48c0-21.314-25.862-32.08-40.971-16.971l-80 80c-9.372 9.373-9.372 24.569 0 33.941l80 80C102.057 463.997 128 453.437 128 432v-48h360c13.255 0 24-10.745 24-24v-16c0-13.255-10.745-24-24-24z"></path></svg></span>{{ i18n.export_import }}</p>
                <p v-bind:title="i18n.storage_menu" v-on:click="showInfo('storage')" v-show="!isEdge()"><span><svg viewBox="0 0 448 512"><title id="database-title">Database</title><path d="M448 73.143v45.714C448 159.143 347.667 192 224 192S0 159.143 0 118.857V73.143C0 32.857 100.333 0 224 0s224 32.857 224 73.143zM448 176v102.857C448 319.143 347.667 352 224 352S0 319.143 0 278.857V176c48.125 33.143 136.208 48.572 224 48.572S399.874 209.143 448 176zm0 160v102.857C448 479.143 347.667 512 224 512S0 479.143 0 438.857V336c48.125 33.143 136.208 48.572 224 48.572S399.874 369.143 448 336z"></path></svg></span>{{ i18n.storage_menu }}</p>
                <p v-bind:title="i18n.security" v-on:click="showInfo('security')"><span><svg viewBox="0 0 512 512"><title id="lock-title">lock</title><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"></path></svg></span>{{ i18n.security }}</p>
                <p v-bind:title="i18n.sync_clock" v-on:click="syncClock()"><span><svg viewBox="0 0 512 512"><title id="sync-alt-title">Alternate Sync</title><path d="M370.72 133.28C339.458 104.008 298.888 87.962 255.848 88c-77.458.068-144.328 53.178-162.791 126.85-1.344 5.363-6.122 9.15-11.651 9.15H24.103c-7.498 0-13.194-6.807-11.807-14.176C33.933 94.924 134.813 8 256 8c66.448 0 126.791 26.136 171.315 68.685L463.03 40.97C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.749zM32 296h134.059c21.382 0 32.09 25.851 16.971 40.971l-41.75 41.75c31.262 29.273 71.835 45.319 114.876 45.28 77.418-.07 144.315-53.144 162.787-126.849 1.344-5.363 6.122-9.15 11.651-9.15h57.304c7.498 0 13.194 6.807 11.807 14.176C478.067 417.076 377.187 504 256 504c-66.448 0-126.791-26.136-171.315-68.685L48.97 471.03C33.851 486.149 8 475.441 8 454.059V320c0-13.255 10.745-24 24-24z"></path></svg></span>{{ i18n.sync_clock }}</p>
                <p v-bind:title="i18n.resize_popup_page" v-on:click="showInfo('resize')"><span><svg viewBox="0 0 512 512"><title id="wrench-title">Wrench</title><path d="M507.73 109.1c-2.24-9.03-13.54-12.09-20.12-5.51l-74.36 74.36-67.88-11.31-11.31-67.88 74.36-74.36c6.62-6.62 3.43-17.9-5.66-20.16-47.38-11.74-99.55.91-136.58 37.93-39.64 39.64-50.55 97.1-34.05 147.2L18.74 402.76c-24.99 24.99-24.99 65.51 0 90.5 24.99 24.99 65.51 24.99 90.5 0l213.21-213.21c50.12 16.71 107.47 5.68 147.37-34.22 37.07-37.07 49.7-89.32 37.91-136.73zM64 472c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24z"></path></svg></span>{{ i18n.resize_popup_page }}</p>
            </div>
                <div class="menuList">
                <p v-bind:title="i18n.feedback" v-on:click="openHelp"><span><svg viewBox="0 0 576 512"><title id="comments-title">comments</title><path d="M416 192c0-88.4-93.1-160-208-160S0 103.6 0 192c0 34.3 14.1 65.9 38 92-13.4 30.2-35.5 54.2-35.8 54.5-2.2 2.3-2.8 5.7-1.5 8.7S4.8 352 8 352c36.6 0 66.9-12.3 88.7-25 32.2 15.7 70.3 25 111.3 25 114.9 0 208-71.6 208-160zm122 220c23.9-26 38-57.7 38-92 0-66.9-53.5-124.2-129.3-148.1.9 6.6 1.3 13.3 1.3 20.1 0 105.9-107.7 192-240 192-10.8 0-21.3-.8-31.7-1.9C207.8 439.6 281.8 480 368 480c41 0 79.1-9.2 111.3-25 21.8 12.7 52.1 25 88.7 25 3.2 0 6.1-1.9 7.3-4.8 1.3-2.9.7-6.3-1.5-8.7-.3-.3-22.4-24.2-35.8-54.5z"></path></svg></span>{{ i18n.feedback }}</p>
                <p v-bind:title="i18n.translate" v-on:click="openLink('https://crwd.in/authenticator-firefox')"><span><svg viewBox="0 0 496 512"><title id="globe-americas-title">Globe with Americas shown</title><path d="M248 8C111.03 8 0 119.03 0 256s111.03 248 248 248 248-111.03 248-248S384.97 8 248 8zm82.29 357.6c-3.9 3.88-7.99 7.95-11.31 11.28-2.99 3-5.1 6.7-6.17 10.71-1.51 5.66-2.73 11.38-4.77 16.87l-17.39 46.85c-13.76 3-28 4.69-42.65 4.69v-27.38c1.69-12.62-7.64-36.26-22.63-51.25-6-6-9.37-14.14-9.37-22.63v-32.01c0-11.64-6.27-22.34-16.46-27.97-14.37-7.95-34.81-19.06-48.81-26.11-11.48-5.78-22.1-13.14-31.65-21.75l-.8-.72a114.792 114.792 0 0 1-18.06-20.74c-9.38-13.77-24.66-36.42-34.59-51.14 20.47-45.5 57.36-82.04 103.2-101.89l24.01 12.01C203.48 89.74 216 82.01 216 70.11v-11.3c7.99-1.29 16.12-2.11 24.39-2.42l28.3 28.3c6.25 6.25 6.25 16.38 0 22.63L264 112l-10.34 10.34c-3.12 3.12-3.12 8.19 0 11.31l4.69 4.69c3.12 3.12 3.12 8.19 0 11.31l-8 8a8.008 8.008 0 0 1-5.66 2.34h-8.99c-2.08 0-4.08.81-5.58 2.27l-9.92 9.65a8.008 8.008 0 0 0-1.58 9.31l15.59 31.19c2.66 5.32-1.21 11.58-7.15 11.58h-5.64c-1.93 0-3.79-.7-5.24-1.96l-9.28-8.06a16.017 16.017 0 0 0-15.55-3.1l-31.17 10.39a11.95 11.95 0 0 0-8.17 11.34c0 4.53 2.56 8.66 6.61 10.69l11.08 5.54c9.41 4.71 19.79 7.16 30.31 7.16s22.59 27.29 32 32h66.75c8.49 0 16.62 3.37 22.63 9.37l13.69 13.69a30.503 30.503 0 0 1 8.93 21.57 46.536 46.536 0 0 1-13.72 32.98zM417 274.25c-5.79-1.45-10.84-5-14.15-9.97l-17.98-26.97a23.97 23.97 0 0 1 0-26.62l19.59-29.38c2.32-3.47 5.5-6.29 9.24-8.15l12.98-6.49C440.2 193.59 448 223.87 448 256c0 8.67-.74 17.16-1.82 25.54L417 274.25z"></path></svg></span>{{ i18n.translate }}</p>
                <p v-bind:title="i18n.source" v-on:click="openLink('https://github.com/Authenticator-Extension/Authenticator')"><span><svg viewBox="0 0 640 512"><title id="code-title">Code</title><path d="M278.9 511.5l-61-17.7c-6.4-1.8-10-8.5-8.2-14.9L346.2 8.7c1.8-6.4 8.5-10 14.9-8.2l61 17.7c6.4 1.8 10 8.5 8.2 14.9L293.8 503.3c-1.9 6.4-8.5 10.1-14.9 8.2zm-114-112.2l43.5-46.4c4.6-4.9 4.3-12.7-.8-17.2L117 256l90.6-79.7c5.1-4.5 5.5-12.3.8-17.2l-43.5-46.4c-4.5-4.8-12.1-5.1-17-.5L3.8 247.2c-5.1 4.7-5.1 12.8 0 17.5l144.1 135.1c4.9 4.6 12.5 4.4 17-.5zm327.2.6l144.1-135.1c5.1-4.7 5.1-12.8 0-17.5L492.1 112.1c-4.8-4.5-12.4-4.3-17 .5L431.6 159c-4.6 4.9-4.3 12.7.8 17.2L523 256l-90.6 79.7c-5.1 4.5-5.5 12.3-.8 17.2l43.5 46.4c4.5 4.9 12.1 5.1 17 .6z"></path></svg></span>{{ i18n.source }}</p>
            </div>
            <div id="version">Version {{ version }}</div>
        </div>
    </div>

    <!-- INFO -->
    <div id="info" v-bind:class="{'fadein': currentClass.fadein, 'fadeout': currentClass.fadeout}">
        <div id="infoClose" v-if="info !== 'passphrase'" v-on:click="closeInfo()"><svg viewBox="0 0 512 512"><title id="times-circle-title">Times Circle</title><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z"></path></svg></div>
        <div id="infoContent">
            <!-- ABOUT -->
            <div v-show="info === 'about'">
                <p><strong>Authenticator</strong> &copy; 2019 <a target='_blank' href='https://github.com/Authenticator-Extension'>Authenticator Extension</a>. Released under the MIT License.</p>
                <p><a target='_blank' href='https://code.google.com/p/crypto-js/'>crypto-js</a> Copyright Jeff Mott. Licensed under the BSD License.</p>
                <p><a target='_blank' href='http://www.droidfonts.com/'>Droid Sans Mono</a> Copyright Steve Matteson. Licensed under the Apache License.</p>
                <p><a target='_blank' href='https://github.com/FortAwesome/Font-Awesome'>Font Awesome Free</a> Licensed under CC BY 4.0</p>
                <p><a target='_blank' href='https://github.com/jprichardson/node-fs-extra'>fs-extra</a> Copyright JP Richardson. Licensed under the MIT License.</p>
                <p>Google and Google Drive are trademarks of Google LLC.</p>
                <p><a target='_blank' href='https://github.com/LazarSoft/jsqrcode'>jsqrcode</a> Copyright Lazar Laszlo. Licensed under the Apache License.</p>
                <p><a target='_blank' href='http://caligatio.github.com/jsSHA/'>jsSHA</a> Copyright Brian Turek. Licensed under the BSD License.</p>
                <p><a target='_blank' href='http://davidshimjs.github.io/qrcodejs/'>qrcode.js</a> Copyright Shim Sangmin. Licensed under the MIT License.</p>
                <p><a target='_blank' href='https://github.com/sass/sass'>sass</a> Copyright Hampton Catlin, Natalie Weizenbaum, and Chris Eppstein under the MIT License</p>
                <p><a target='_blank' href='http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/'>totp.js</a> Copyright Russ Sayers. Licensed under the MIT License.</p>
                <p><a target='_blank' href='https://github.com/google/ts-style'>ts-style</a> Copyright Google Inc. Licensed under the Apache License.</p>
                <p><a target='_blank' href='https://github.com/Microsoft/TypeScript'>TypeScript</a> Copyright Microsoft Corporation. Licensed under the Apache License.</p>
                <p><a target='_blank' href='https://github.com/vuejs/vue'>vue.js</a> Copyright Evan You. Licensed under the MIT License.</p>
                <p><a target='_blank' href='https://github.com/Astray-git/vue-dragula'>vue-dragula</a> Copyright Yichang Liu. Licensed under the MIT License.</p>
                <p><a target='_blank' href='https://github.com/zxing/zxing'>ZXing</a> Copyright ZXing authors. Licensed under the Apache License.</p>
                <p>Thanks to <a target='_blank' href='https://github.com/multiwebinc'>Mike Robinson</a> &lt;3</p>
                <p v-if="!isEdge()"><a target='_blank' href='qrdebug.html'>QR Debugging</a></p>
                <!-- Workaround for https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/18438862 -->
                <p v-else><a v-on:click="createWindow('view/qrdebug.html')">QR Debugging</a></p>
            </div>
            <!-- ADD ACCOUNT -->
            <div v-show="info === 'account'">
                <div v-show="!newAccount.show">
                    <div class="button" v-on:click="beginCapture()">{{ i18n.add_qr }}</div>
                    <div class="button" v-on:click="addAccountManually()">{{ i18n.add_secret }}</div>
                </div>
                <div v-show="newAccount.show">
                    <label>{{ i18n.accountName }}</label>
                    <input type="text" class="input" v-model="newAccount.account">
                    <label>{{ i18n.secret }}</label>
                    <input type="text" class="input" v-model="newAccount.secret">
                    <select v-model="newAccount.type">
                        <option v-bind:value="OTPType.totp">{{ i18n.based_on_time }}</option>
                        <option v-bind:value="OTPType.hotp">{{ i18n.based_on_counter }}</option>
                        <option v-bind:value="OTPType.battle">Battle.net</option>
                        <option v-bind:value="OTPType.steam">Steam</option>
                    </select>
                    <div class="button-small" v-on:click="addNewAccount()">{{ i18n.ok }}</div>
                </div>
            </div>
            <!-- SECURITY -->
            <div v-show="info === 'security'">
                <div class="text warning">{{ i18n.security_warning }}</div>
                <label>{{ i18n.phrase }}</label>
                <input class="input" type="password" v-model="newPassphrase.phrase">
                <label>{{ i18n.confirm_phrase }}</label>
                <input class="input" type="password" v-model="newPassphrase.confirm" v-on:keyup.enter="changePassphrase()">
                <div id="security-save" v-on:click="changePassphrase()">{{ i18n.ok }}</div>
                <div id="security-remove" v-on:click="removePassphrase()">{{ i18n.remove }}</div>
            </div>
            <!-- PASSPHRASE -->
            <div v-show="info === 'passphrase'">
                <div class="text">{{ i18n.passphrase_info }}</div>
                <label></label>
                <input class="input" type="password" v-model="passphrase" v-on:keyup.enter="applyPassphrase()" autofocus>
                <div class="button-small" v-on:click="applyPassphrase()">{{ i18n.ok }}</div>
            </div>
            <!-- EXPORT -->
            <div v-show="info === 'export'">
                <div class="text warning" v-if="!encryption.getEncryptionStatus()">{{ i18n.export_info }}</div>
                <div class="text warning" v-if="unsupportedAccounts">{{ i18n.otp_unsupported_warn }}</div>
                <a class="button" v-on:click="showEdgeBugWarning()" v-if="isEdge()">{{ i18n.download_backup }}</a>
                <a download="authenticator.txt" v-bind:href="exportOneLineOtpAuthFile" v-if="!unsupportedAccounts" class="button" target="_blank">{{ i18n.download_backup }}</a>
                <a download="authenticator.json" v-bind:href="exportFile" class="button" target="_blank" v-else>{{ i18n.download_backup }}</a>
                <a download="authenticator.json" v-bind:href="exportEncryptedFile" v-if="encryption.getEncryptionStatus()" class="button" target="_blank">{{ i18n.download_enc_backup }}</a>
                <a class="button" href="import.html" target="_blank" v-if="!isEdge()">{{ i18n.import_backup }}</a>
                <!-- Workaround for https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/18438862 -->
                <a class="button" v-on:click="createWindow('view/import.html')" v-else>{{ i18n.import_backup }}</a>
            </div>
            <!-- DROPBOX -->
            <div v-show="info === 'dropbox'">
                <div>
                    <div class="text warning" v-if="dropboxEncrypted !== 'true' || !encryption.getEncryptionStatus()">{{ i18n.dropbox_risk }}</div>
                    <div v-if="encryption.getEncryptionStatus() && dropboxToken">
                        <label class="combo-label">{{ i18n.encrypted }}</label>
                        <select v-model="dropboxEncrypted" v-on:change="backupUpdateEncryption('dropbox')">
                            <option value="true">{{ i18n.yes }}</option>
                            <option value="false">{{ i18n.no }}</option>
                        </select>
                    </div>
                    <div class="button" v-if="dropboxToken" v-on:click="backupLogout('dropbox')">{{ i18n.log_out }}</div>
                    <div class="button" v-else v-on:click="getBackupToken('dropbox')">{{ i18n.sign_in }}</div>
                    <div class="button" v-if="dropboxToken" v-on:click="backupUpload('dropbox')">{{ i18n.manual_dropbox }}</div>
                </div>
            </div>
            <!-- DRIVE -->
            <div v-show="info === 'drive'">
                <div>
                    <div class="text warning" v-if="driveEncrypted !== 'true' || !encryption.getEncryptionStatus()">{{ i18n.dropbox_risk }}</div>
                    <div v-if="encryption.getEncryptionStatus() && driveToken">
                        <label class="combo-label">{{ i18n.encrypted }}</label>
                        <select v-model="driveEncrypted" v-on:change="backupUpdateEncryption('drive')">
                            <option value="true">{{ i18n.yes }}</option>
                            <option value="false">{{ i18n.no }}</option>
                        </select>
                    </div>
                    <div class="button" v-if="driveToken" v-on:click="backupLogout('drive')">{{ i18n.log_out }}</div>
                    <div class="button" v-else v-on:click="getBackupToken('drive')">{{ i18n.sign_in }}</div>
                    <div class="button" v-if="driveToken" v-on:click="backupUpload('drive')">{{ i18n.manual_dropbox }}</div>
                </div>
            </div>
            <!-- STORAGE & SYNC SETTINGS -->
            <div v-show="info === 'storage'">
                <!-- Storage Settings -->
                <div class="text">{{ i18n.storage_location_info }}</div>
                <label class="combo-label">{{ i18n.storage_location }}</label>
                <select v-model="newStorageLocation" :disabled="storageArea" v-on:change="migrateStorage()">
                    <option value="sync">sync</option>
                    <option value="local">local</option>
                </select>
                <!-- 3rd Party Backup Services -->
                <div v-show="!backupDisabled" class="text">{{ i18n.storage_sync_info }}</div>
                <p></p>
                <div class="button" v-show="!backupDisabled" v-on:click="showInfo('drive')">Google Drive</div>
                <div class="button" v-show="!backupDisabled" v-on:click="showInfo('dropbox')">Dropbox</div>
            </div>
            <!-- POPUP PAGE SETTINGS -->
            <div v-show="info === 'resize'">
                <div>
                    <label class="combo-label">{{ i18n.scale }}</label>
                    <select v-model="zoom" v-on:change="saveZoom()">
                        <option value="125">125%</option>
                        <option value="100">100%</option>
                        <option value="90">90%</option>
                        <option value="80">80%</option>
                        <option value="67">67%</option>
                        <option value="57">57%</option>
                        <option value="50">50%</option>
                        <option value="40">40%</option>
                        <option value="33">33%</option>
                        <option value="25">25%</option>
                        <option value="20">20%</option>
                    </select>
                </div>
                <div>
                    <label class="combo-label">{{ i18n.use_autofill }}</label>
                    <input class="checkbox" type="checkbox" v-model="useAutofill" v-on:change="saveAutofill()">
                </div>
                <div>
                    <label class="combo-label">{{ i18n.use_high_contrast }}</label>
                    <input class="checkbox" type="checkbox" v-model="useHighContrast" v-on:change="saveHighContrast()">
                </div>
                <div class="button" v-on:click="popOut()">{{ i18n.popout }}</div>
            </div>
        </div>
    </div>

    <!-- MESSAGE -->
    <div class="message-box" v-show="message.length && messageIdle">
        <div>{{ message.length ? message[0] : '' }}</div>
        <div class="button-small" v-on:click="closeAlert()">{{ i18n.ok }}</div>
    </div>

    <!-- CONFRIM -->
    <div class="message-box" v-show="confirmMessage !== ''">
        <div>{{ confirmMessage }}</div>
        <div class="buttons">
            <div class="button-small" v-on:click="confirmOK()">{{ i18n.yes }}</div>
            <div class="button-small" v-on:click="confirmCancel()">{{ i18n.no }}</div>
        </div>
    </div>

    <!-- NOTIFICATITON -->
    <div id="notification" v-bind:class="{'fadein': currentClass.notificationFadein, 'fadeout': currentClass.notificationFadeout}">{{ notification }}</div>

    <!-- QR -->
    <div id="qr" v-bind:class="{'qrfadein': currentClass.qrfadein, 'qrfadeout': currentClass.qrfadeout}" v-bind:style="{'background-image': qr}" v-on:click="hideQr()"></div>

    <!-- OVERLAY -->
    <div id="overlay" v-show="message.length && messageIdle || confirmMessage !== ''"></div>

    <!-- CLIPBOARD -->
    <input type="text" id="codeClipboard" />
</div>
</template>
<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';

export default Vue.extend({
  computed: mapState({
      useHighContrast (state) {
          return this.$store.state.style.useHighContrast;
      },
      isEditing (state) {
          return this.$store.state.style.isEditing;
      }
  }),
  methods: {
    isPopup() {
      const params = new URLSearchParams(document.location.search.substring(1));
      return params.get('popup');
    }
  }
});
</script>
