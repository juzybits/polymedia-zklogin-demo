import './App.less';

export const App: React.FC = () =>
{
    return (
        <div>
            <button onClick={googleLogin}>Google login</button>
        </div>
    );
}

async function googleLogin() {
    const nonce = 'test nonce qCVOEFqiUVTp4Qast67AyranG2MgciBr';

    const urlParams = new URLSearchParams({
        client_id: '139697148457-3s1nc6h8an06f84do363lbc6j61i0vfo.apps.googleusercontent.com',
        nonce: nonce,
        redirect_uri: 'http://localhost:1234',
        response_type: 'id_token',
        scope: 'openid',
    });

    const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${urlParams}`;

    window.location.replace(loginUrl);
}
